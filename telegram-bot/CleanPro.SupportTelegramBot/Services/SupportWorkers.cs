using System.Text.Json;
using CleanPro.SupportTelegramBot.Options;
using CleanPro.SupportTelegramBot.UI;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Enums;
using Microsoft.Extensions.Options;
using Telegram.Bot;
using Telegram.Bot.Polling;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;

namespace CleanPro.SupportTelegramBot.Services;

public sealed class SupportPollingService(
    ITelegramBotClient botClient,
    SupportBotHandler updateHandler,
    IOptions<SupportTelegramBotOptions> options,
    ILogger<SupportPollingService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var token = options.Value.BotToken;
        if (string.IsNullOrWhiteSpace(token))
        {
            logger.LogWarning("Support bot token is not configured. Polling is disabled.");
            return;
        }

        logger.LogInformation("Support Telegram bot polling started.");

        var receiverOptions = new ReceiverOptions
        {
            AllowedUpdates = [UpdateType.Message, UpdateType.CallbackQuery],
        };

        botClient.StartReceiving(
            async (_, update, ct) => await updateHandler.HandleUpdateAsync(update, ct),
            (_, exception, _) =>
            {
                logger.LogError(exception, "Support bot polling error");
                return Task.CompletedTask;
            },
            receiverOptions,
            stoppingToken);

        try
        {
            var me = await botClient.GetMe(stoppingToken);
            logger.LogInformation("Support bot @{Username} is ready.", me.Username);
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("Support bot polling stopped.");
        }
    }
}

internal sealed class SupportOutboxPayload
{
    public Guid TicketId { get; set; }

    public Guid MessageId { get; set; }
}

public sealed class SupportOutboxWorker(
    ITelegramBotClient botClient,
    IServiceScopeFactory scopeFactory,
    IOptions<SupportTelegramBotOptions> options,
    ILogger<SupportOutboxWorker> logger) : BackgroundService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(options.Value.BotToken))
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var supportRepository = scope.ServiceProvider.GetRequiredService<ISupportTicketRepository>();

                var batch = await supportRepository.GetPendingOutboxAsync(20, stoppingToken);
                foreach (var item in batch)
                {
                    await ProcessOutboxItemAsync(supportRepository, item.Type, item.PayloadJson, stoppingToken);
                    await supportRepository.MarkOutboxProcessedAsync(item.Id, stoppingToken);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Support outbox worker error");
            }

            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
    }

    private async Task ProcessOutboxItemAsync(
        ISupportTicketRepository supportRepository,
        SupportOutboxType type,
        string payloadJson,
        CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Deserialize<SupportOutboxPayload>(payloadJson, JsonOptions);
        if (payload is null)
        {
            return;
        }

        var ticket = await supportRepository.FindByIdAsync(payload.TicketId, cancellationToken);
        if (ticket is null)
        {
            return;
        }

        var messages = await supportRepository.GetMessagesAsync(payload.TicketId, null, cancellationToken);
        var message = messages.FirstOrDefault(item => item.Id == payload.MessageId);
        if (message is null)
        {
            return;
        }

        var admins = await supportRepository.GetLinkedSupportAdminsAsync(cancellationToken);
        if (admins.Count == 0)
        {
            return;
        }

        var userDisplayId = ticket.UserId.ToString()[..8].ToUpperInvariant();
        var alertTitle = type == SupportOutboxType.NotifyAdminsNewTicket
            ? "🆕 Нове звернення"
            : "💬 Нове повідомлення";

        var text =
            $"{alertTitle}\n\n" +
            $"Клієнт: *{ticket.User?.Name ?? "—"}*\n" +
            $"ID: `{userDisplayId}`\n" +
            $"Тел: {ticket.User?.Phone ?? "—"}\n\n" +
            $"_{message.Body}_";

        foreach (var admin in admins)
        {
            try
            {
                await botClient.SendMessage(
                    admin.ChatId,
                    text,
                    parseMode: ParseMode.Markdown,
                    replyMarkup: SupportBotKeyboards.TicketActions(ticket.Id, ticket.Status != SupportTicketStatus.Closed),
                    cancellationToken: cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to notify support admin {ChatId}", admin.ChatId);
            }
        }
    }
}
