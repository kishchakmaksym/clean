using CleanPro.HiringTelegramBot.Options;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Domain.Enums;
using Microsoft.Extensions.Options;
using Telegram.Bot;
using Telegram.Bot.Polling;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;

namespace CleanPro.HiringTelegramBot.Services;

public sealed class HiringPollingService(
    ITelegramBotClient botClient,
    HiringBotHandler updateHandler,
    IOptions<HiringTelegramBotOptions> options,
    ILogger<HiringPollingService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var token = options.Value.BotToken;
        if (string.IsNullOrWhiteSpace(token))
        {
            logger.LogWarning("Hiring bot token is not configured. Polling is disabled.");
            return;
        }

        logger.LogInformation("Hiring Telegram bot polling started.");

        var receiverOptions = new ReceiverOptions
        {
            AllowedUpdates = [UpdateType.Message],
        };

        botClient.StartReceiving(
            async (_, update, ct) => await updateHandler.HandleUpdateAsync(update, ct),
            (_, exception, _) =>
            {
                logger.LogError(exception, "Hiring bot polling error");
                return Task.CompletedTask;
            },
            receiverOptions,
            stoppingToken);

        try
        {
            var me = await botClient.GetMe(stoppingToken);
            logger.LogInformation("Hiring bot @{Username} is ready.", me.Username);
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("Hiring bot polling stopped.");
        }
    }
}

public sealed class HiringBotHandler(
    ITelegramBotClient botClient,
    IOptions<HiringTelegramBotOptions> options,
    ILogger<HiringBotHandler> logger)
{
    public async Task HandleUpdateAsync(Update update, CancellationToken cancellationToken)
    {
        if (update.Message?.Text is not { } text || update.Message.Chat is null)
        {
            return;
        }

        if (!text.StartsWith("/start", StringComparison.OrdinalIgnoreCase))
        {
            await botClient.SendMessage(
                update.Message.Chat.Id,
                "Цей бот лише для сповіщень про нові заявки прибиральниць.\n\nНадішліть /start, щоб дізнатися ваш chat id для налаштування.",
                cancellationToken: cancellationToken);
            return;
        }

        var chatId = update.Message.Chat.Id;
        var configuredIds = options.Value.GetNotifyChatIds();
        var isConfigured = configuredIds.Contains(chatId);

        await botClient.SendMessage(
            chatId,
            "🧹 *Smart Clean — вакансії*\n\n" +
            $"Ваш chat id: `{chatId}`\n\n" +
            (isConfigured
                ? "✅ Цей чат уже в списку отримувачів нових заявок."
                : "Додайте цей chat id у `HiringTelegramBot:NotifyChatIds` у appsettings бота."),
            parseMode: ParseMode.Markdown,
            cancellationToken: cancellationToken);

        logger.LogInformation("Hiring bot /start from chat {ChatId}, configured={Configured}", chatId, isConfigured);
    }
}

public sealed class HiringOutboxWorker(
    ITelegramBotClient botClient,
    IServiceScopeFactory scopeFactory,
    IOptions<HiringTelegramBotOptions> options,
    ILogger<HiringOutboxWorker> logger) : BackgroundService
{
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
                var repository = scope.ServiceProvider.GetRequiredService<IJobApplicationRepository>();
                var chatIds = options.Value.GetNotifyChatIds();

                var batch = await repository.GetPendingOutboxAsync(20, stoppingToken);
                foreach (var item in batch)
                {
                    await ProcessOutboxItemAsync(repository, item, chatIds, stoppingToken);
                    await repository.MarkOutboxProcessedAsync(item.Id, stoppingToken);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Hiring outbox worker error");
            }

            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
        }
    }

    private async Task ProcessOutboxItemAsync(
        IJobApplicationRepository repository,
        HiringOutboxMessage item,
        IReadOnlyList<long> chatIds,
        CancellationToken cancellationToken)
    {
        if (chatIds.Count == 0)
        {
            logger.LogWarning("Hiring bot: no NotifyChatIds configured, skipping application {ApplicationId}", item.ApplicationId);
            return;
        }

        var application = await repository.FindByIdAsync(item.ApplicationId, cancellationToken);
        if (application is null)
        {
            return;
        }

        var text = BuildApplicationMessage(application);

        foreach (var chatId in chatIds)
        {
            try
            {
                await botClient.SendMessage(
                    chatId,
                    text,
                    parseMode: ParseMode.Markdown,
                    cancellationToken: cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to notify hiring chat {ChatId}", chatId);
            }
        }
    }

    private static string BuildApplicationMessage(JobApplication application)
    {
        var ageLine = application.Age.HasValue ? $"{application.Age} років" : "—";
        var experience = string.IsNullOrWhiteSpace(application.Experience) ? "—" : application.Experience;
        var about = string.IsNullOrWhiteSpace(application.About) ? "—" : application.About;
        var shortId = application.Id.ToString()[..8].ToUpperInvariant();

        return
            "🆕 *Нова заявка — прибиральниця*\n\n" +
            $"*Ім'я:* {EscapeMarkdown(application.FullName)}\n" +
            $"*Телефон:* {EscapeMarkdown(application.Phone)}\n" +
            $"*Вік:* {EscapeMarkdown(ageLine)}\n\n" +
            $"*Досвід:*\n{EscapeMarkdown(experience)}\n\n" +
            $"*Про себе:*\n{EscapeMarkdown(about)}\n\n" +
            $"ID: `{shortId}`";
    }

    private static string EscapeMarkdown(string value) =>
        value.Replace("_", "\\_", StringComparison.Ordinal).Replace("*", "\\*", StringComparison.Ordinal);
}
