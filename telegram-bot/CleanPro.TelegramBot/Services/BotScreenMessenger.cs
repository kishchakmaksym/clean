using CleanPro.TelegramBot.State;
using LearnCSharp.Application.Interfaces;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;

namespace CleanPro.TelegramBot.Services;

public sealed class BotScreenMessenger(
    ITelegramBotClient botClient,
    UserSessionStore sessions,
    IServiceScopeFactory scopeFactory,
    ILogger<BotScreenMessenger> logger)
{
    private const int OldMessageCleanupDelayMs = 180;
    private const int UserMessageCleanupDelayMs = 120;

    public async Task<Message> SendScreenAsync(
        UserSession session,
        long chatId,
        long telegramUserId,
        int? persistedScreenMessageId,
        string text,
        ReplyMarkup? replyMarkup,
        ParseMode parseMode,
        CancellationToken cancellationToken)
    {
        await using (await sessions.AcquireLockAsync(telegramUserId, cancellationToken))
        {
            HydrateSession(session, persistedScreenMessageId);

            var idsToDelete = CollectScreenIdsToDelete(session, persistedScreenMessageId);
            session.EphemeralBotMessageIds.Clear();

            var message = await botClient.SendMessage(
                chatId,
                text,
                parseMode: parseMode,
                replyMarkup: replyMarkup,
                cancellationToken: cancellationToken);

            session.LastBotMessageId = message.MessageId;
            session.ActivePersistedScreenMessageId = message.MessageId;

            await PersistScreenMessageIdAsync(telegramUserId, message.MessageId, cancellationToken);
            ScheduleMessageDeletion(chatId, idsToDelete, OldMessageCleanupDelayMs);

            return message;
        }
    }

    public async Task<Message> SendEphemeralAsync(
        UserSession session,
        long chatId,
        long telegramUserId,
        string text,
        ReplyMarkup? replyMarkup,
        ParseMode? parseMode,
        CancellationToken cancellationToken)
    {
        await using (await sessions.AcquireLockAsync(telegramUserId, cancellationToken))
        {
            var message = parseMode is null
                ? await botClient.SendMessage(
                    chatId,
                    text,
                    replyMarkup: replyMarkup,
                    cancellationToken: cancellationToken)
                : await botClient.SendMessage(
                    chatId,
                    text,
                    parseMode: parseMode.Value,
                    replyMarkup: replyMarkup,
                    cancellationToken: cancellationToken);

            session.EphemeralBotMessageIds.Add(message.MessageId);
            return message;
        }
    }

    public Task DeleteUserMessageAsync(Message? userMessage, CancellationToken cancellationToken)
    {
        if (userMessage?.Chat is null)
        {
            return Task.CompletedTask;
        }

        ScheduleMessageDeletion(
            userMessage.Chat.Id,
            [userMessage.MessageId],
            UserMessageCleanupDelayMs);

        return Task.CompletedTask;
    }

    public Task DeleteMessageAfterResponseAsync(long chatId, int messageId)
    {
        ScheduleMessageDeletion(chatId, [messageId], OldMessageCleanupDelayMs);
        return Task.CompletedTask;
    }

    private static void HydrateSession(UserSession session, int? persistedScreenMessageId)
    {
        if (session.LastBotMessageId is null && persistedScreenMessageId is int persisted)
        {
            session.LastBotMessageId = persisted;
        }
    }

    private static List<int> CollectScreenIdsToDelete(UserSession session, int? persistedScreenMessageId)
    {
        var ids = new HashSet<int>();

        foreach (var id in session.EphemeralBotMessageIds)
        {
            ids.Add(id);
        }

        if (session.LastBotMessageId is int lastBotMessageId)
        {
            ids.Add(lastBotMessageId);
        }

        if (persistedScreenMessageId is int persisted)
        {
            ids.Add(persisted);
        }

        return ids.ToList();
    }

    private async Task PersistScreenMessageIdAsync(
        long telegramUserId,
        int messageId,
        CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var repository = scope.ServiceProvider.GetRequiredService<ITelegramStaffRepository>();
            await repository.UpdateLastBotScreenMessageIdAsync(telegramUserId, messageId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Could not persist last bot screen message id for user {TelegramUserId}",
                telegramUserId);
        }
    }

    private void ScheduleMessageDeletion(long chatId, IReadOnlyCollection<int> messageIds, int delayMs)
    {
        if (messageIds.Count == 0)
        {
            return;
        }

        var ids = messageIds.Distinct().ToArray();

        _ = Task.Run(async () =>
        {
            try
            {
                if (delayMs > 0)
                {
                    await Task.Delay(delayMs);
                }

                foreach (var messageId in ids)
                {
                    await TryDeleteMessageAsync(chatId, messageId);
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Scheduled message cleanup failed in chat {ChatId}", chatId);
            }
        });
    }

    private async Task TryDeleteMessageAsync(long chatId, int messageId)
    {
        try
        {
            await botClient.DeleteMessage(chatId, messageId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not delete message {MessageId} in chat {ChatId}", messageId, chatId);
        }
    }
}
