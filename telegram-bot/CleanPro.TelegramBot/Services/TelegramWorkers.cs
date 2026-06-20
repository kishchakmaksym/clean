using System.Text.Json;
using CleanPro.TelegramBot.Options;
using CleanPro.TelegramBot.UI;
using LearnCSharp.Application.DTOs.Telegram;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Application.Orders;
using LearnCSharp.Domain.Enums;
using Microsoft.Extensions.Options;
using Telegram.Bot;
using Telegram.Bot.Polling;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;

namespace CleanPro.TelegramBot.Services;

public sealed class TelegramPollingService(
    ITelegramBotClient botClient,
    BotUpdateHandler updateHandler,
    IOptions<TelegramBotOptions> options,
    ILogger<TelegramPollingService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var token = options.Value.BotToken;
        if (string.IsNullOrWhiteSpace(token) || token.Contains("PUT_YOUR", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning("Telegram bot token is not configured. Polling is disabled.");
            return;
        }

        logger.LogInformation("Telegram bot polling started.");

        var receiverOptions = new ReceiverOptions
        {
            AllowedUpdates = [UpdateType.Message, UpdateType.CallbackQuery],
        };

        botClient.StartReceiving(
            async (client, update, ct) => await updateHandler.HandleUpdateAsync(update, ct),
            (_, exception, _) =>
            {
                logger.LogError(exception, "Telegram polling error");
                return Task.CompletedTask;
            },
            receiverOptions,
            stoppingToken);

        try
        {
            var me = await botClient.GetMe(stoppingToken);
            logger.LogInformation("Bot @{Username} is ready.", me.Username);
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("Telegram bot polling stopped.");
        }
    }
}

public sealed class TelegramOutboxWorker(
    ITelegramBotClient botClient,
    ITelegramStaffRepository staffRepository,
    IOptions<TelegramBotOptions> options,
    ILogger<TelegramOutboxWorker> logger) : BackgroundService
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
                var batch = await staffRepository.DequeueOutboxBatchAsync(20, stoppingToken);
                foreach (var item in batch)
                {
                    await ProcessOutboxItemAsync(item, stoppingToken);
                    await staffRepository.MarkOutboxProcessedAsync(item.Id, stoppingToken);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Outbox worker error");
            }

            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
    }

    private async Task ProcessOutboxItemAsync(TelegramOutboxDto item, CancellationToken cancellationToken)
    {
        switch (item.Type)
        {
            case TelegramOutboxType.NewOrder:
                await HandleNewOrderAsync(item.PayloadJson, cancellationToken);
                break;
            case TelegramOutboxType.OrderClaimed:
                await HandleOrderClaimedAsync(item.PayloadJson, cancellationToken);
                break;
            case TelegramOutboxType.StaffBroadcast:
                await HandleBroadcastAsync(item.PayloadJson, cancellationToken);
                break;
        }
    }

    private async Task HandleNewOrderAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Deserialize<NewOrderOutboxPayload>(payloadJson, JsonOptions);
        if (payload is null)
        {
            return;
        }

        var order = await staffRepository.FindOrderByIdAsync(payload.OrderId, cancellationToken);
        if (order is null)
        {
            return;
        }

        var dto = await MapOrderAsync(payload.OrderId, cancellationToken);
        if (dto is null)
        {
            return;
        }

        var staffAccounts = await staffRepository.GetStaffAccountsAsync(cancellationToken);
        foreach (var account in staffAccounts)
        {
            if (account.Role == UserRole.Employee)
            {
                var profile = await staffRepository.GetEmployeeProfileAsync(account.UserId, cancellationToken);
                if (profile is null || !profile.CanAcceptOrders || profile.SharePercent <= 0)
                {
                    continue;
                }
            }

            var message = await botClient.SendMessage(
                account.ChatId,
                BotMessages.NewOrderAlert(dto),
                parseMode: ParseMode.Markdown,
                replyMarkup: new InlineKeyboardMarkup([
                    [InlineKeyboardButton.WithCallbackData("✅ Прийняти", BotCallbacks.Claim(dto.Id))],
                ]),
                cancellationToken: cancellationToken);

            await staffRepository.SaveOrderNotificationAsync(
                payload.OrderId,
                account.ChatId,
                message.MessageId,
                cancellationToken);
        }
    }

    private async Task HandleOrderClaimedAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Deserialize<OrderClaimedOutboxPayload>(payloadJson, JsonOptions);
        if (payload is null)
        {
            return;
        }

        var dto = await MapOrderAsync(payload.OrderId, cancellationToken);
        if (dto is null)
        {
            return;
        }

        var notifications = await staffRepository.GetOpenNotificationsForOrderAsync(payload.OrderId, cancellationToken);
        foreach (var notification in notifications)
        {
            try
            {
                await botClient.EditMessageText(
                    notification.ChatId,
                    notification.MessageId,
                    BotMessages.OrderClaimedNotice(payload.AssigneeName, dto),
                    parseMode: ParseMode.Markdown,
                    replyMarkup: null,
                    cancellationToken: cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Could not edit notification message {MessageId}", notification.MessageId);
            }
        }

        await staffRepository.CloseOrderNotificationsAsync(payload.OrderId, cancellationToken);
    }

    private async Task HandleBroadcastAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Deserialize<StaffBroadcastOutboxPayload>(payloadJson, JsonOptions);
        if (payload is null)
        {
            return;
        }

        var staffAccounts = await staffRepository.GetStaffAccountsAsync(cancellationToken);
        foreach (var account in staffAccounts.Where(item => item.Role == UserRole.Employee))
        {
            await botClient.SendMessage(
                account.ChatId,
                $"📢 *Повідомлення від адміністрації*\n\n{BotMessages.Escape(payload.Message)}",
                parseMode: ParseMode.Markdown,
                cancellationToken: cancellationToken);
        }
    }

    private async Task<StaffOrderDto?> MapOrderAsync(Guid orderId, CancellationToken cancellationToken)
    {
        var order = await staffRepository.FindOrderByIdAsync(orderId, cancellationToken);
        if (order is null)
        {
            return null;
        }

        var assignment = await staffRepository.GetOrderAssignmentAsync(orderId, cancellationToken);
        return new StaffOrderDto
        {
            Id = order.Id,
            ShortId = order.Id.ToString()[..8].ToUpperInvariant(),
            Status = order.Status.ToString(),
            ServiceTitle = order.ServiceTitle,
            CustomerName = order.User?.Name ?? "Клієнт",
            CustomerPhone = order.User?.Phone ?? "—",
            Address = order.Address,
            TimeSlotLabel = order.TimeSlotLabel,
            PaymentMethod = order.PaymentMethod,
            PayableAmount = order.PayableAmount,
            Notes = order.Notes,
            SelectedAddons = OrderAddonsJson.Deserialize(order.SelectedAddonsJson),
            CreatedAtUtc = order.CreatedAtUtc,
            AssigneeName = assignment?.EmployeeName,
        };
    }
}
