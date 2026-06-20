using CleanPro.SupportTelegramBot.State;
using CleanPro.SupportTelegramBot.UI;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Enums;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;

namespace CleanPro.SupportTelegramBot.Services;

public sealed class SupportBotHandler(
    ITelegramBotClient botClient,
    IServiceScopeFactory scopeFactory,
    SupportSessionStore sessions,
    ILogger<SupportBotHandler> logger)
{
    public async Task HandleUpdateAsync(Update update, CancellationToken cancellationToken)
    {
        try
        {
            if (update.Message is not null)
            {
                await HandleMessageAsync(update.Message, cancellationToken);
                return;
            }

            if (update.CallbackQuery is not null)
            {
                await HandleCallbackAsync(update.CallbackQuery, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to handle support bot update");
        }
    }

    private async Task HandleMessageAsync(Message message, CancellationToken cancellationToken)
    {
        if (message.Chat is null)
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

        await using var scope = scopeFactory.CreateAsyncScope();
        var supportRepository = scope.ServiceProvider.GetRequiredService<ISupportTicketRepository>();
        var supportService = scope.ServiceProvider.GetRequiredService<ISupportTicketService>();

        var account = await supportRepository.FindSupportAccountByTelegramUserIdAsync(telegramUserId, cancellationToken);
        if (account is null)
        {
            await SendLoginPromptAsync(chatId, cancellationToken);
            return;
        }

        var session = sessions.GetOrCreate(telegramUserId);
        var text = message.Text?.Trim() ?? string.Empty;

        if (text.Equals("/start", StringComparison.OrdinalIgnoreCase))
        {
            sessions.Clear(telegramUserId);
            await SendMainMenuAsync(chatId, account.User.Name, cancellationToken);
            return;
        }

        if (session.Mode == SupportSessionMode.AwaitingReply && session.ActiveTicketId is Guid ticketId)
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                await botClient.SendMessage(chatId, "Напишіть текст відповіді.", cancellationToken: cancellationToken);
                return;
            }

            var result = await supportService.SendStaffMessageFromTelegramAsync(
                account.UserId,
                ticketId,
                text,
                cancellationToken);

            sessions.ClearReplyMode(telegramUserId);

            await botClient.SendMessage(
                chatId,
                result.Success ? "✅ Відповідь надіслано клієнту." : result.Errors.FirstOrDefault() ?? "Помилка.",
                replyMarkup: SupportBotKeyboards.MainMenu(),
                cancellationToken: cancellationToken);
            return;
        }

        if (text.Equals("/tickets", StringComparison.OrdinalIgnoreCase))
        {
            await SendTicketsAsync(chatId, account.UserId, cancellationToken);
            return;
        }

        await botClient.SendMessage(
            chatId,
            "Оберіть звернення в меню або натисніть /tickets",
            replyMarkup: SupportBotKeyboards.MainMenu(),
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
                "❌ Надішліть свій контакт, а не чужий.",
                cancellationToken: cancellationToken);
            return;
        }

        await using var scope = scopeFactory.CreateAsyncScope();
        var supportService = scope.ServiceProvider.GetRequiredService<ISupportTicketService>();

        var result = await supportService.LinkTelegramAdminAsync(
            telegramUserId,
            chatId,
            contact.PhoneNumber ?? string.Empty,
            cancellationToken);

        await botClient.SendMessage(
            chatId,
            result.Message,
            replyMarkup: result.Success ? SupportBotKeyboards.MainMenu() : SupportBotKeyboards.LoginContact(),
            cancellationToken: cancellationToken);
    }

    private async Task HandleCallbackAsync(CallbackQuery query, CancellationToken cancellationToken)
    {
        if (query.Message?.Chat is null || query.From is null)
        {
            return;
        }

        var chatId = query.Message.Chat.Id;
        var telegramUserId = query.From.Id;
        var data = query.Data ?? string.Empty;

        await using var scope = scopeFactory.CreateAsyncScope();
        var supportRepository = scope.ServiceProvider.GetRequiredService<ISupportTicketRepository>();
        var supportService = scope.ServiceProvider.GetRequiredService<ISupportTicketService>();

        var account = await supportRepository.FindSupportAccountByTelegramUserIdAsync(telegramUserId, cancellationToken);
        if (account is null)
        {
            await botClient.AnswerCallbackQuery(query.Id, "Спочатку увійдіть через /start", cancellationToken: cancellationToken);
            return;
        }

        try
        {
            if (data == SupportBotCallbacks.MenuHome)
            {
                sessions.Clear(telegramUserId);
                await SendMainMenuAsync(chatId, account.User.Name, cancellationToken);
            }
            else if (data == SupportBotCallbacks.MenuTickets)
            {
                sessions.ClearReplyMode(telegramUserId);
                await SendTicketsAsync(chatId, account.UserId, cancellationToken);
            }
            else if (SupportBotCallbacks.TryParseTicketId(data, out var ticketId))
            {
                sessions.SetReplyMode(telegramUserId, ticketId);
                await ShowTicketAsync(chatId, account.UserId, ticketId, cancellationToken);
            }
            else if (SupportBotCallbacks.TryParseCloseId(data, out var closeTicketId))
            {
                var result = await supportService.CloseTicketAsync(account.UserId, closeTicketId, cancellationToken);
                await botClient.SendMessage(
                    chatId,
                    result.Success ? "✅ Звернення закрито." : result.Errors.FirstOrDefault() ?? "Помилка.",
                    cancellationToken: cancellationToken);
                await SendTicketsAsync(chatId, account.UserId, cancellationToken);
            }

            await botClient.AnswerCallbackQuery(query.Id, cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Support callback failed: {Data}", data);
            await botClient.AnswerCallbackQuery(query.Id, "Помилка. Спробуйте ще раз.", cancellationToken: cancellationToken);
        }
    }

    private async Task SendLoginPromptAsync(long chatId, CancellationToken cancellationToken)
    {
        await botClient.SendMessage(
            chatId,
            "🛟 *Бот підтримки Smart Clean*\n\nУвійдіть номером телефону адміністратора.",
            parseMode: ParseMode.Markdown,
            replyMarkup: SupportBotKeyboards.LoginContact(),
            cancellationToken: cancellationToken);
    }

    private async Task SendMainMenuAsync(long chatId, string adminName, CancellationToken cancellationToken)
    {
        await botClient.SendMessage(
            chatId,
            $"Вітаємо, {adminName}! Тут ви відповідаєте клієнтам на звернення.",
            replyMarkup: SupportBotKeyboards.MainMenu(),
            cancellationToken: cancellationToken);
    }

    private async Task SendTicketsAsync(long chatId, Guid adminUserId, CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var supportService = scope.ServiceProvider.GetRequiredService<ISupportTicketService>();

        var data = await supportService.GetTicketsForAdminAsync(adminUserId, cancellationToken);
        var openTickets = data.Tickets
            .Where(ticket => ticket.Status != SupportTicketStatus.Closed.ToString())
            .Take(12)
            .ToList();

        if (openTickets.Count == 0)
        {
            await botClient.SendMessage(
                chatId,
                "Немає відкритих звернень 🎉",
                replyMarkup: SupportBotKeyboards.MainMenu(),
                cancellationToken: cancellationToken);
            return;
        }

        var rows = openTickets
            .Select(ticket =>
                InlineKeyboardButton.WithCallbackData(
                    $"{(ticket.UnreadForStaff > 0 ? "🔴 " : "")}{ticket.CustomerName} · {ticket.UserDisplayId}",
                    SupportBotCallbacks.Ticket(ticket.Id)))
            .Chunk(1)
            .Select(chunk => chunk.ToArray())
            .ToArray();

        await botClient.SendMessage(
            chatId,
            "Оберіть звернення:",
            replyMarkup: new InlineKeyboardMarkup(rows),
            cancellationToken: cancellationToken);
    }

    private async Task ShowTicketAsync(long chatId, Guid adminUserId, Guid ticketId, CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var supportService = scope.ServiceProvider.GetRequiredService<ISupportTicketService>();

        var thread = await supportService.GetTicketThreadForAdminAsync(adminUserId, ticketId, null, cancellationToken);
        if (thread is null)
        {
            await botClient.SendMessage(chatId, "Звернення не знайдено.", cancellationToken: cancellationToken);
            return;
        }

        var ticket = thread.Ticket;
        var recent = thread.Messages.TakeLast(6).ToList();
        var body = string.Join(
            "\n\n",
            recent.Select(message =>
                $"*{message.SenderName}*: {message.Body}"));

        var header =
            $"*{ticket.CustomerName}* · ID `{ticket.UserDisplayId}`\n" +
            $"{ticket.CustomerPhone}\n" +
            $"_{ticket.Subject ?? "Звернення"}_\n\n" +
            body +
            "\n\n✍️ Напишіть відповідь наступним повідомленням.";

        var canClose = ticket.Status != SupportTicketStatus.Closed.ToString();

        await botClient.SendMessage(
            chatId,
            header,
            parseMode: ParseMode.Markdown,
            replyMarkup: SupportBotKeyboards.TicketActions(ticketId, canClose),
            cancellationToken: cancellationToken);
    }
}
