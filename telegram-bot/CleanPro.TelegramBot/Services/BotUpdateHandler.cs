using CleanPro.TelegramBot.State;
using CleanPro.TelegramBot.UI;
using LearnCSharp.Application.DTOs.Telegram;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Enums;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;

namespace CleanPro.TelegramBot.Services;

public sealed class BotUpdateHandler(
    ITelegramBotClient botClient,
    ITelegramStaffRepository staffRepository,
    ITelegramStaffService staffService,
    UserSessionStore sessions,
    BotScreenMessenger screenMessenger,
    ILogger<BotUpdateHandler> logger)
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
            logger.LogError(ex, "Failed to handle Telegram update");
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
            await HandleContactAsync(chatId, telegramUserId, message, message.Contact, cancellationToken);
            return;
        }

        var account = await staffRepository.FindAccountByTelegramUserIdAsync(telegramUserId, cancellationToken);
        if (account is null)
        {
            await SendUnauthorizedAsync(chatId, telegramUserId, cancellationToken);
            return;
        }

        await staffRepository.TouchLastSeenAsync(telegramUserId, cancellationToken);

        var session = sessions.GetOrCreate(telegramUserId);
        BindSessionContext(session, telegramUserId, account);
        var text = message.Text?.Trim() ?? string.Empty;

        if (text.Equals("/start", StringComparison.OrdinalIgnoreCase) ||
            text.Equals("/menu", StringComparison.OrdinalIgnoreCase))
        {
            ResetSession(session);
            await SendMainMenuAsync(chatId, account, session, cancellationToken);
            await DeleteUserMessageAsync(message, cancellationToken);
            return;
        }

        if (account.Role == UserRole.Admin && session.Mode == UserSessionMode.AwaitingBroadcast)
        {
            if (IsCancel(text) || text == BotLabels.Back)
            {
                session.Mode = UserSessionMode.None;
                await SendAdminMenuAsync(chatId, account, session, cancellationToken);
                await DeleteUserMessageAsync(message, cancellationToken);
                return;
            }

            session.Mode = UserSessionMode.None;
            var result = await staffService.QueueBroadcastAsync(account.UserId, text, cancellationToken);
            await SendEphemeralAsync(
                session,
                chatId,
                result.Message,
                replyMarkup: null,
                parseMode: ParseMode.Markdown,
                cancellationToken);
            await SendAdminMenuAsync(chatId, account, session, cancellationToken);
            await DeleteUserMessageAsync(message, cancellationToken);
            return;
        }

        if (account.Role == UserRole.Admin &&
            session.Mode == UserSessionMode.AwaitingEmployeeShare &&
            session.TargetEmployeeId is Guid shareEmployeeId)
        {
            if (IsCancel(text) || text == BotLabels.Back)
            {
                session.Mode = UserSessionMode.None;
                await ShowEmployeeAsync(chatId, account, shareEmployeeId, cancellationToken);
                await DeleteUserMessageAsync(message, cancellationToken);
                return;
            }

            if (!decimal.TryParse(text.Replace(',', '.'), out var share))
            {
                await SendScreenAsync(
                    session,
                    chatId,
                    "Введіть число від 0 до 100.",
                    BotKeyboards.CancelOnly(),
                    ParseMode.None,
                    cancellationToken);
                await DeleteUserMessageAsync(message, cancellationToken);
                return;
            }

            session.Mode = UserSessionMode.None;
            var result = await staffService.SetEmployeeShareAsync(account.UserId, shareEmployeeId, share, cancellationToken);
            await SendEphemeralAsync(session, chatId, result.Message, null, null, cancellationToken);
            await ShowEmployeeAsync(chatId, account, shareEmployeeId, cancellationToken);
            await DeleteUserMessageAsync(message, cancellationToken);
            return;
        }

        if (await TryHandleNavigationTextAsync(chatId, account, session, text, cancellationToken))
        {
            await DeleteUserMessageAsync(message, cancellationToken);
            return;
        }

        await SendMainMenuAsync(chatId, account, session, cancellationToken);
        await DeleteUserMessageAsync(message, cancellationToken);
    }

    private async Task<bool> TryHandleNavigationTextAsync(
        long chatId,
        TelegramAccountDto account,
        UserSession session,
        string text,
        CancellationToken cancellationToken)
    {
        if (text == BotLabels.Back)
        {
            await HandleBackAsync(chatId, account, session, cancellationToken);
            return true;
        }

        if (text == BotLabels.Available)
        {
            await SendAvailableOrdersAsync(chatId, account, session, cancellationToken);
            return true;
        }

        if (text == BotLabels.MyOrders)
        {
            await SendMyOrdersAsync(chatId, account, session, cancellationToken);
            return true;
        }

        if (text == BotLabels.Stats)
        {
            await SendStatsAsync(chatId, account, session, cancellationToken);
            return true;
        }

        if (text == BotLabels.Admin && account.Role == UserRole.Admin)
        {
            await SendAdminMenuAsync(chatId, account, session, cancellationToken);
            return true;
        }

        if (text == BotLabels.Employees && account.Role == UserRole.Admin)
        {
            await SendEmployeesAsync(chatId, account, session, cancellationToken);
            return true;
        }

        if (text == BotLabels.Logs && account.Role == UserRole.Admin)
        {
            await SendLogsFilterAsync(chatId, account, session, cancellationToken);
            return true;
        }

        if (text == BotLabels.LogsToday && account.Role == UserRole.Admin)
        {
            await SendLogsPageAsync(chatId, account, session, StaffAuditLogPeriod.Today, 0, cancellationToken);
            return true;
        }

        if (text == BotLabels.LogsYesterday && account.Role == UserRole.Admin)
        {
            await SendLogsPageAsync(chatId, account, session, StaffAuditLogPeriod.Yesterday, 0, cancellationToken);
            return true;
        }

        if (text == BotLabels.Logs7Days && account.Role == UserRole.Admin)
        {
            await SendLogsPageAsync(chatId, account, session, StaffAuditLogPeriod.Last7Days, 0, cancellationToken);
            return true;
        }

        if (text == BotLabels.LogsMonth && account.Role == UserRole.Admin)
        {
            await SendLogsPageAsync(chatId, account, session, StaffAuditLogPeriod.LastMonth, 0, cancellationToken);
            return true;
        }

        if (text == BotLabels.LogsNext &&
            account.Role == UserRole.Admin &&
            session.LogPeriod is StaffAuditLogPeriod period)
        {
            await SendLogsPageAsync(chatId, account, session, period, session.LogPage + 1, cancellationToken);
            return true;
        }

        if (text == BotLabels.LogsPrev &&
            account.Role == UserRole.Admin &&
            session.LogPeriod is StaffAuditLogPeriod prevPeriod &&
            session.LogPage > 0)
        {
            await SendLogsPageAsync(chatId, account, session, prevPeriod, session.LogPage - 1, cancellationToken);
            return true;
        }

        if (text == BotLabels.LogsChangePeriod && account.Role == UserRole.Admin)
        {
            await SendLogsFilterAsync(chatId, account, session, cancellationToken);
            return true;
        }

        if (text == BotLabels.Broadcast && account.Role == UserRole.Admin)
        {
            session.Mode = UserSessionMode.AwaitingBroadcast;
            session.Nav = UserNavigationContext.Admin;
            await SendScreenAsync(
                session,
                chatId,
                "📢 Напишіть повідомлення для *всіх працівників* одним текстом:",
                BotKeyboards.CancelOnly(),
                ParseMode.Markdown,
                cancellationToken);
            return true;
        }

        if (text == BotLabels.Claim && session.TargetOrderId is Guid claimOrderId)
        {
            await ClaimOrderAsync(chatId, account, session, claimOrderId, cancellationToken);
            return true;
        }

        if (text == BotLabels.Complete && session.TargetOrderId is Guid completeOrderId)
        {
            await UpdateStatusAsync(
                chatId,
                account,
                session,
                completeOrderId,
                nameof(OrderStatus.Completed),
                cancellationToken);
            return true;
        }

        if (text == BotLabels.ChangeShare &&
            account.Role == UserRole.Admin &&
            session.TargetEmployeeId is Guid shareTargetId)
        {
            session.Mode = UserSessionMode.AwaitingEmployeeShare;
            await SendScreenAsync(
                session,
                chatId,
                "✏️ Введіть нову долю працівника (0–100):",
                BotKeyboards.CancelOnly(),
                ParseMode.None,
                cancellationToken);
            return true;
        }

        if (account.Role == UserRole.Admin &&
            session.TargetEmployeeId is Guid toggleEmployeeId &&
            (text == BotLabels.EnableAccept || text == BotLabels.DisableAccept))
        {
            var employees = await staffService.GetEmployeesAsync(cancellationToken);
            var employee = employees.FirstOrDefault(item => item.UserId == toggleEmployeeId);
            if (employee is not null)
            {
                var enable = text == BotLabels.EnableAccept;
                var result = await staffService.SetEmployeeAcceptAsync(
                    account.UserId,
                    toggleEmployeeId,
                    enable,
                    cancellationToken);
                await SendEphemeralAsync(session, chatId, result.Message, null, null, cancellationToken);
                await ShowEmployeeAsync(chatId, account, toggleEmployeeId, cancellationToken);
            }

            return true;
        }

        if (text.StartsWith("🆕 №", StringComparison.Ordinal) &&
            BotLabels.TryParseOrderShortId(text, out var availableShortId))
        {
            var orders = await staffService.GetAvailableOrdersAsync(account.UserId, cancellationToken);
            var order = orders.FirstOrDefault(item =>
                item.ShortId.Equals(availableShortId, StringComparison.OrdinalIgnoreCase));
            if (order is not null)
            {
                await ClaimOrderAsync(chatId, account, session, order.Id, cancellationToken);
            }

            return true;
        }

        if (text.StartsWith("📋 №", StringComparison.Ordinal) &&
            BotLabels.TryParseOrderShortId(text, out var myShortId))
        {
            var orders = await staffService.GetMyOrdersAsync(account.UserId, cancellationToken);
            var order = orders.FirstOrDefault(item =>
                item.ShortId.Equals(myShortId, StringComparison.OrdinalIgnoreCase));
            if (order is not null)
            {
                await ShowOrderAsync(chatId, account, session, order.Id, cancellationToken);
            }

            return true;
        }

        if (account.Role == UserRole.Admin &&
            (text.StartsWith("🟢 ", StringComparison.Ordinal) || text.StartsWith("🔴 ", StringComparison.Ordinal)))
        {
            var employees = await staffService.GetEmployeesAsync(cancellationToken);
            var employee = employees.FirstOrDefault(item => BotLabels.EmployeeLabel(item) == text);
            if (employee is not null)
            {
                await ShowEmployeeAsync(chatId, account, employee.UserId, cancellationToken);
                return true;
            }
        }

        return false;
    }

    private async Task HandleBackAsync(
        long chatId,
        TelegramAccountDto account,
        UserSession session,
        CancellationToken cancellationToken)
    {
        switch (session.Nav)
        {
            case UserNavigationContext.EmployeeDetail:
                session.TargetEmployeeId = null;
                await SendEmployeesAsync(chatId, account, session, cancellationToken);
                break;
            case UserNavigationContext.Employees:
                await SendAdminMenuAsync(chatId, account, session, cancellationToken);
                break;
            case UserNavigationContext.LogsFilter:
            case UserNavigationContext.Logs:
                await SendAdminMenuAsync(chatId, account, session, cancellationToken);
                break;
            case UserNavigationContext.OrderDetail:
                session.TargetOrderId = null;
                if (session.ReturnNav == UserNavigationContext.MyOrders)
                {
                    await SendMyOrdersAsync(chatId, account, session, cancellationToken);
                }
                else
                {
                    await SendAvailableOrdersAsync(chatId, account, session, cancellationToken);
                }

                break;
            default:
                await SendMainMenuAsync(chatId, account, session, cancellationToken);
                break;
        }
    }

    private async Task HandleContactAsync(
        long chatId,
        long telegramUserId,
        Message userMessage,
        Contact contact,
        CancellationToken cancellationToken)
    {
        var session = sessions.GetOrCreate(telegramUserId);
        BindSessionContext(session, telegramUserId);

        if (contact.UserId != telegramUserId)
        {
            await SendScreenAsync(
                session,
                chatId,
                "❌ Надішліть *свій* контакт, а не чужий.",
                BotKeyboards.LoginContact(),
                ParseMode.Markdown,
                cancellationToken);
            await DeleteUserMessageAsync(userMessage, cancellationToken);
            return;
        }

        var phone = contact.PhoneNumber;
        if (string.IsNullOrWhiteSpace(phone))
        {
            await SendScreenAsync(
                session,
                chatId,
                "Не вдалося отримати номер.",
                BotKeyboards.LoginContact(),
                ParseMode.None,
                cancellationToken);
            await DeleteUserMessageAsync(userMessage, cancellationToken);
            return;
        }

        var result = await staffService.LinkByContactAsync(telegramUserId, chatId, phone, cancellationToken);

        if (result.Success && result.Account is not null)
        {
            ResetSession(session);
            BindSessionContext(session, telegramUserId, result.Account);
            await SendEphemeralAsync(
                session,
                chatId,
                result.Message,
                new ReplyKeyboardRemove(),
                ParseMode.Markdown,
                cancellationToken);
            await SendMainMenuAsync(chatId, result.Account, session, cancellationToken);
            await DeleteUserMessageAsync(userMessage, cancellationToken);
            return;
        }

        await SendScreenAsync(
            session,
            chatId,
            result.Message,
            BotKeyboards.LoginContact(),
            ParseMode.Markdown,
            cancellationToken);
        await DeleteUserMessageAsync(userMessage, cancellationToken);
    }

    private async Task HandleCallbackAsync(CallbackQuery query, CancellationToken cancellationToken)
    {
        if (query.Message?.Chat is null || query.From is null)
        {
            return;
        }

        var chatId = query.Message.Chat.Id;
        var telegramUserId = query.From.Id;
        var account = await staffRepository.FindAccountByTelegramUserIdAsync(telegramUserId, cancellationToken);

        if (account is null)
        {
            await botClient.AnswerCallbackQuery(query.Id, "Спочатку увійдіть через /start", cancellationToken: cancellationToken);
            return;
        }

        await staffRepository.TouchLastSeenAsync(telegramUserId, cancellationToken);
        var session = sessions.GetOrCreate(telegramUserId);
        BindSessionContext(session, telegramUserId, account);
        var data = query.Data ?? string.Empty;

        try
        {
            if (data.StartsWith("c:", StringComparison.Ordinal) &&
                BotCallbacks.TryParseGuid(data[2..], out var orderId))
            {
                var pushMessageId = query.Message.MessageId;
                await ClaimOrderAsync(chatId, account, session, orderId, cancellationToken);
                await screenMessenger.DeleteMessageAfterResponseAsync(chatId, pushMessageId);
            }

            await botClient.AnswerCallbackQuery(query.Id, cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Callback failed: {Data}", data);
            await botClient.AnswerCallbackQuery(query.Id, "Помилка. Спробуйте ще раз.", cancellationToken: cancellationToken);
        }
    }

    private async Task ClaimOrderAsync(
        long chatId,
        TelegramAccountDto account,
        UserSession session,
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var result = await staffService.ClaimOrderAsync(account.UserId, orderId, cancellationToken);

        if (result.Success && result.Order is not null)
        {
            session.Nav = UserNavigationContext.OrderDetail;
            session.ReturnNav = UserNavigationContext.AvailableOrders;
            session.TargetOrderId = orderId;

            var text = $"{result.Message}\n\n{BotMessages.OrderCard(result.Order)}";
            await SendScreenAsync(
                session,
                chatId,
                text,
                BotKeyboards.OrderDetailReply(result.Order, true),
                ParseMode.Markdown,
                cancellationToken);
            return;
        }

        await SendEphemeralAsync(session, chatId, result.Message, null, ParseMode.Markdown, cancellationToken);
        await SendAvailableOrdersAsync(chatId, account, session, cancellationToken);
    }

    private async Task ShowOrderAsync(
        long chatId,
        TelegramAccountDto account,
        UserSession session,
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var order = await staffService.GetOrderDetailsAsync(account.UserId, orderId, cancellationToken);
        if (order is null)
        {
            await SendScreenAsync(
                session,
                chatId,
                "Замовлення недоступне.",
                BotKeyboards.BackReply(),
                ParseMode.None,
                cancellationToken);
            return;
        }

        var assignment = await staffRepository.GetOrderAssignmentAsync(orderId, cancellationToken);
        var isAssignee = assignment?.EmployeeUserId == account.UserId;

        session.ReturnNav = session.Nav == UserNavigationContext.MyOrders
            ? UserNavigationContext.MyOrders
            : UserNavigationContext.AvailableOrders;
        session.Nav = UserNavigationContext.OrderDetail;
        session.TargetOrderId = orderId;

        await SendScreenAsync(
            session,
            chatId,
            BotMessages.OrderCard(order),
            BotKeyboards.OrderDetailReply(order, isAssignee),
            ParseMode.Markdown,
            cancellationToken);
    }

    private async Task UpdateStatusAsync(
        long chatId,
        TelegramAccountDto account,
        UserSession session,
        Guid orderId,
        string status,
        CancellationToken cancellationToken)
    {
        var result = await staffService.UpdateOrderStatusAsync(account.UserId, orderId, status, cancellationToken);

        if (result.Order is not null)
        {
            var assignment = await staffRepository.GetOrderAssignmentAsync(orderId, cancellationToken);
            var isAssignee = assignment?.EmployeeUserId == account.UserId;
            session.TargetOrderId = orderId;

            var text = $"{result.Message}\n\n{BotMessages.OrderCard(result.Order)}";
            await SendScreenAsync(
                session,
                chatId,
                text,
                BotKeyboards.OrderDetailReply(result.Order, isAssignee),
                ParseMode.Markdown,
                cancellationToken);
            return;
        }

        await SendEphemeralAsync(session, chatId, result.Message, null, null, cancellationToken);
        await SendMyOrdersAsync(chatId, account, session, cancellationToken);
    }

    private async Task SendUnauthorizedAsync(long chatId, long telegramUserId, CancellationToken cancellationToken)
    {
        var session = sessions.GetOrCreate(telegramUserId);
        BindSessionContext(session, telegramUserId);
        await SendScreenAsync(
            session,
            chatId,
            BotMessages.WelcomeUnauthorized(),
            BotKeyboards.LoginContact(),
            ParseMode.Markdown,
            cancellationToken);
    }

    private async Task SendMainMenuAsync(
        long chatId,
        TelegramAccountDto account,
        UserSession session,
        CancellationToken cancellationToken)
    {
        ResetSession(session);
        BindSessionContext(session, account.TelegramUserId, account);
        await SendScreenAsync(
            session,
            chatId,
            BotMessages.MainMenu(account),
            BotKeyboards.MainMenuReply(account.Role),
            ParseMode.Markdown,
            cancellationToken);
    }

    private async Task SendAvailableOrdersAsync(
        long chatId,
        TelegramAccountDto account,
        UserSession session,
        CancellationToken cancellationToken)
    {
        session.Nav = UserNavigationContext.AvailableOrders;
        session.TargetOrderId = null;
        session.TargetEmployeeId = null;

        var orders = await staffService.GetAvailableOrdersAsync(account.UserId, cancellationToken);
        var text = orders.Count == 0
            ? BotMessages.EmptyList("Немає доступних замовлень 🎉")
            : "🆕 *Доступні замовлення*\n\nОберіть, щоб одразу взяти:";

        await SendScreenAsync(
            session,
            chatId,
            text,
            orders.Count == 0 ? BotKeyboards.BackReply() : BotKeyboards.AvailableOrdersReply(orders),
            ParseMode.Markdown,
            cancellationToken);
    }

    private async Task SendMyOrdersAsync(
        long chatId,
        TelegramAccountDto account,
        UserSession session,
        CancellationToken cancellationToken)
    {
        session.Nav = UserNavigationContext.MyOrders;
        session.TargetOrderId = null;
        session.TargetEmployeeId = null;

        var orders = await staffService.GetMyOrdersAsync(account.UserId, cancellationToken);
        var text = orders.Count == 0
            ? BotMessages.EmptyList("Активних замовлень немає")
            : "📋 *Ваші активні замовлення*";

        await SendScreenAsync(
            session,
            chatId,
            text,
            orders.Count == 0 ? BotKeyboards.BackReply() : BotKeyboards.MyOrdersReply(orders),
            ParseMode.Markdown,
            cancellationToken);
    }

    private async Task SendStatsAsync(
        long chatId,
        TelegramAccountDto account,
        UserSession session,
        CancellationToken cancellationToken)
    {
        session.Nav = UserNavigationContext.Stats;
        session.TargetOrderId = null;
        session.TargetEmployeeId = null;

        var stats = await staffService.GetEmployeeStatsAsync(account.UserId, cancellationToken);
        await SendScreenAsync(
            session,
            chatId,
            BotMessages.Stats(stats),
            BotKeyboards.BackReply(),
            ParseMode.Markdown,
            cancellationToken);
    }

    private async Task SendAdminMenuAsync(
        long chatId,
        TelegramAccountDto account,
        UserSession session,
        CancellationToken cancellationToken)
    {
        session.Nav = UserNavigationContext.Admin;
        session.Mode = UserSessionMode.None;
        session.TargetOrderId = null;
        session.TargetEmployeeId = null;
        BindSessionContext(session, account.TelegramUserId, account);

        await SendScreenAsync(
            session,
            chatId,
            "⚙️ *Адмін-панель*\n\nОберіть розділ нижче 👇",
            BotKeyboards.AdminMenuReply(),
            ParseMode.Markdown,
            cancellationToken);
    }

    private async Task SendLogsFilterAsync(
        long chatId,
        TelegramAccountDto account,
        UserSession session,
        CancellationToken cancellationToken)
    {
        session.Nav = UserNavigationContext.LogsFilter;
        session.LogPeriod = null;
        session.LogPage = 0;
        session.TargetOrderId = null;
        session.TargetEmployeeId = null;

        await SendScreenAsync(
            session,
            chatId,
            "📜 *Журнал подій*\n\nОберіть період:",
            BotKeyboards.LogsFilterReply(),
            ParseMode.Markdown,
            cancellationToken);
    }

    private async Task SendLogsPageAsync(
        long chatId,
        TelegramAccountDto account,
        UserSession session,
        StaffAuditLogPeriod period,
        int page,
        CancellationToken cancellationToken)
    {
        session.Nav = UserNavigationContext.Logs;
        session.LogPeriod = period;
        session.LogPage = page;
        session.TargetOrderId = null;
        session.TargetEmployeeId = null;

        var logsPage = await staffService.GetAuditLogsPageAsync(
            period,
            page,
            BotLabels.LogsPageSize,
            cancellationToken);

        if (logsPage.TotalPages > 0 && page >= logsPage.TotalPages)
        {
            await SendLogsPageAsync(chatId, account, session, period, logsPage.TotalPages - 1, cancellationToken);
            return;
        }

        session.LogPage = logsPage.Page;

        await SendScreenAsync(
            session,
            chatId,
            BotMessages.AuditLogsPage(logsPage),
            BotKeyboards.LogsPageReply(logsPage.HasPreviousPage, logsPage.HasNextPage),
            ParseMode.Markdown,
            cancellationToken);
    }

    private async Task SendEmployeesAsync(
        long chatId,
        TelegramAccountDto account,
        UserSession session,
        CancellationToken cancellationToken)
    {
        session.Nav = UserNavigationContext.Employees;
        session.TargetOrderId = null;
        session.TargetEmployeeId = null;

        var employees = await staffService.GetEmployeesAsync(cancellationToken);
        await SendScreenAsync(
            session,
            chatId,
            BotMessages.Employees(employees),
            BotKeyboards.EmployeesReply(employees),
            ParseMode.Markdown,
            cancellationToken);
    }

    private async Task ShowEmployeeAsync(
        long chatId,
        TelegramAccountDto account,
        Guid employeeId,
        CancellationToken cancellationToken)
    {
        var session = sessions.GetOrCreate(account.TelegramUserId);
        var employees = await staffService.GetEmployeesAsync(cancellationToken);
        var employee = employees.FirstOrDefault(item => item.UserId == employeeId);
        if (employee is null)
        {
            await SendScreenAsync(
                session,
                chatId,
                "Працівника не знайдено.",
                BotKeyboards.BackReply(),
                ParseMode.None,
                cancellationToken);
            return;
        }

        session.Nav = UserNavigationContext.EmployeeDetail;
        session.TargetEmployeeId = employeeId;
        session.TargetOrderId = null;
        session.Mode = UserSessionMode.None;

        await SendScreenAsync(
            session,
            chatId,
            BotMessages.EmployeeDetails(employee),
            BotKeyboards.EmployeeAdminReply(employee),
            ParseMode.Markdown,
            cancellationToken);
    }

    private Task<Message> SendScreenAsync(
        UserSession session,
        long chatId,
        string text,
        ReplyMarkup? replyMarkup,
        ParseMode parseMode,
        CancellationToken cancellationToken)
    {
        var telegramUserId = session.ActiveTelegramUserId
            ?? throw new InvalidOperationException("Telegram user id is not bound to the session.");

        return screenMessenger.SendScreenAsync(
            session,
            chatId,
            telegramUserId,
            session.ActivePersistedScreenMessageId,
            text,
            replyMarkup,
            parseMode,
            cancellationToken);
    }

    private Task<Message> SendEphemeralAsync(
        UserSession session,
        long chatId,
        string text,
        ReplyMarkup? replyMarkup,
        ParseMode? parseMode,
        CancellationToken cancellationToken)
    {
        var telegramUserId = session.ActiveTelegramUserId
            ?? throw new InvalidOperationException("Telegram user id is not bound to the session.");

        return screenMessenger.SendEphemeralAsync(
            session,
            chatId,
            telegramUserId,
            text,
            replyMarkup,
            parseMode,
            cancellationToken);
    }

    private Task DeleteUserMessageAsync(Message? userMessage, CancellationToken cancellationToken) =>
        screenMessenger.DeleteUserMessageAsync(userMessage, cancellationToken);

    private static void BindSessionContext(
        UserSession session,
        long telegramUserId,
        TelegramAccountDto? account = null)
    {
        session.ActiveTelegramUserId = telegramUserId;

        if (account is not null)
        {
            session.ActivePersistedScreenMessageId = account.LastBotScreenMessageId;
        }
    }

    private static void ResetSession(UserSession session)
    {
        session.Mode = UserSessionMode.None;
        session.Nav = UserNavigationContext.Main;
        session.ReturnNav = UserNavigationContext.Main;
        session.TargetEmployeeId = null;
        session.TargetOrderId = null;
        session.LogPeriod = null;
        session.LogPage = 0;
    }

    private static bool IsCancel(string text) =>
        text.Equals(BotKeyboards.CancelLabel, StringComparison.Ordinal);
}
