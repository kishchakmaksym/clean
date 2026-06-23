using CleanPro.HiringTelegramBot.Options;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Application.Validation;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Domain.Enums;
using Microsoft.Extensions.Options;
using Telegram.Bot;
using Telegram.Bot.Polling;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;

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
    IServiceScopeFactory scopeFactory,
    ILogger<HiringBotHandler> logger)
{
    public async Task HandleUpdateAsync(Update update, CancellationToken cancellationToken)
    {
        if (update.Message is not { } message)
        {
            return;
        }

        var chatId = message.Chat.Id;
        var telegramUserId = message.From?.Id ?? chatId;

        if (message.Contact is not null)
        {
            await HandleContactAsync(chatId, telegramUserId, message.Contact, cancellationToken);
            return;
        }

        if (message.Text?.Trim().StartsWith("/start", StringComparison.OrdinalIgnoreCase) == true)
        {
            await SendLoginPromptAsync(chatId, cancellationToken);
            return;
        }

        await botClient.SendMessage(
            chatId,
            "Цей бот показує заявки на вакансії тільки адміністраторам. Натисніть /start і поділіться номером.",
            replyMarkup: LoginContactKeyboard(),
            cancellationToken: cancellationToken);
    }

    private async Task HandleContactAsync(
        long chatId,
        long telegramUserId,
        Contact contact,
        CancellationToken cancellationToken)
    {
        if (contact.UserId != telegramUserId)
        {
            await botClient.SendMessage(
                chatId,
                "Надішліть саме свій контакт через кнопку нижче.",
                replyMarkup: LoginContactKeyboard(),
                cancellationToken: cancellationToken);
            return;
        }

        if (!AuthValidator.TryNormalizePhone(contact.PhoneNumber ?? string.Empty, out var normalizedPhone))
        {
            await botClient.SendMessage(
                chatId,
                "Не вдалося прочитати номер телефону з Telegram. Спробуйте ще раз через кнопку.",
                replyMarkup: LoginContactKeyboard(),
                cancellationToken: cancellationToken);
            return;
        }

        await using var scope = scopeFactory.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var staffRepository = scope.ServiceProvider.GetRequiredService<ITelegramStaffRepository>();

        var user = await users.FindByPhoneAsync(normalizedPhone, cancellationToken);
        if (user is null || user.Role != UserRole.Admin)
        {
            await botClient.SendMessage(
                chatId,
                "Цей номер не має доступу адміністратора Smart Clean.",
                replyMarkup: LoginContactKeyboard(),
                cancellationToken: cancellationToken);
            return;
        }

        await staffRepository.LinkAccountAsync(
            user.Id,
            telegramUserId,
            chatId,
            normalizedPhone,
            cancellationToken);

        await botClient.SendMessage(
            chatId,
            "✅ Доступ відкрито. Нові заявки на вакансії приходитимуть у цей чат.",
            replyMarkup: new ReplyKeyboardRemove(),
            cancellationToken: cancellationToken);

        logger.LogInformation("Hiring bot linked admin {UserId} to chat {ChatId}", user.Id, chatId);
    }

    private async Task SendLoginPromptAsync(long chatId, CancellationToken cancellationToken)
    {
        await botClient.SendMessage(
            chatId,
            "Бот вакансій Smart Clean.\n\nПоділіться номером телефону. Якщо номер належить адміністратору, бот підключить сповіщення про нові заявки.",
            replyMarkup: LoginContactKeyboard(),
            cancellationToken: cancellationToken);
    }

    private static ReplyKeyboardMarkup LoginContactKeyboard() =>
        new(
            [
                [KeyboardButton.WithRequestContact("📱 Поділитися номером")],
            ])
        {
            ResizeKeyboard = true,
            OneTimeKeyboard = true,
        };
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
                var staffRepository = scope.ServiceProvider.GetRequiredService<ITelegramStaffRepository>();
                var chatIds = await GetAdminChatIdsAsync(staffRepository, stoppingToken);

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

    private static async Task<IReadOnlyList<long>> GetAdminChatIdsAsync(
        ITelegramStaffRepository staffRepository,
        CancellationToken cancellationToken)
    {
        var accounts = await staffRepository.GetStaffAccountsAsync(cancellationToken);
        return accounts
            .Where(account => account.Role == UserRole.Admin)
            .Select(account => account.ChatId)
            .Distinct()
            .ToList();
    }

    private async Task ProcessOutboxItemAsync(
        IJobApplicationRepository repository,
        HiringOutboxMessage item,
        IReadOnlyList<long> chatIds,
        CancellationToken cancellationToken)
    {
        if (chatIds.Count == 0)
        {
            logger.LogWarning("Hiring bot: no linked admin chats, skipping application {ApplicationId}", item.ApplicationId);
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
            "🆕 Нова заявка — прибиральниця\n\n" +
            $"Ім'я: {application.FullName}\n" +
            $"Телефон: {application.Phone}\n" +
            $"Вік: {ageLine}\n\n" +
            $"Досвід:\n{experience}\n\n" +
            $"Про себе:\n{about}\n\n" +
            $"ID: {shortId}";
    }
}
