using CleanPro.TelegramBot.State;
using CleanPro.TelegramBot.UI;
using LearnCSharp.Application.DTOs.Telegram;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Enums;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;

namespace CleanPro.TelegramBot.Services;

public sealed class BotUpdateHandler(
    ITelegramBotClient botClient,
    ITelegramStaffRepository staffRepository,
    ITelegramStaffService staffService,
    UserSessionStore sessions,
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
            await HandleContactAsync(chatId, telegramUserId, message.Contact, cancellationToken);
            return;
        }

        var account = await staffRepository.FindAccountByTelegramUserIdAsync(telegramUserId, cancellationToken);
        if (account is null)
        {
            await SendUnauthorizedAsync(chatId, cancellationToken);
            return;
        }

        await staffRepository.TouchLastSeenAsync(telegramUserId, cancellationToken);

        var session = sessions.GetOrCreate(telegramUserId);
        var text = message.Text?.Trim() ?? string.Empty;

        if (text.Equals("/start", StringComparison.OrdinalIgnoreCase))
        {
            sessions.Clear(telegramUserId);
            await SendMainMenuAsync(chatId, account, cancellationToken);
            return;
        }

        if (account.Role == UserRole.Admin && session.Mode == UserSessionMode.AwaitingBroadcast)
        {
            sessions.Clear(telegramUserId);
            var result = await staffService.QueueBroadcastAsync(account.UserId, text, cancellationToken);
            await botClient.SendMessage(
                chatId,
                result.Message,
                parseMode: ParseMode.Markdown,
                replyMarkup: BotKeyboards.MainMenu(account.Role),
                cancellationToken: cancellationToken);
            return;
        }

        if (account.Role == UserRole.Admin && session.Mode == UserSessionMode.AwaitingEmployeeShare && session.TargetEmployeeId is Guid employeeId)
        {
            sessions.Clear(telegramUserId);
            if (!decimal.TryParse(text.Replace(',', '.'), out var share))
            {
                await botClient.SendMessage(chatId, "Введіть число від 0 до 100.", cancellationToken: cancellationToken);
                return;
            }

            var result = await staffService.SetEmployeeShareAsync(account.UserId, employeeId, share, cancellationToken);
            await botClient.SendMessage(chatId, result.Message, cancellationToken: cancellationToken);
            await SendEmployeesAsync(chatId, account, cancellationToken);
            return;
        }

        if (text.Equals("/menu", StringComparison.OrdinalIgnoreCase))
        {
            await SendMainMenuAsync(chatId, account, cancellationToken);
            return;
        }

        await botClient.SendMessage(
            chatId,
            "Оберіть дію в меню 👇",
            replyMarkup: BotKeyboards.MainMenu(account.Role),
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
                "❌ Надішліть *свій* контакт, а не чужий.",
                parseMode: ParseMode.Markdown,
                cancellationToken: cancellationToken);
            return;
        }

        var phone = contact.PhoneNumber;
        if (string.IsNullOrWhiteSpace(phone))
        {
            await botClient.SendMessage(chatId, "Не вдалося отримати номер.", cancellationToken: cancellationToken);
            return;
        }

        var result = await staffService.LinkByContactAsync(telegramUserId, chatId, phone, cancellationToken);
        await botClient.SendMessage(
            chatId,
            result.Message,
            parseMode: ParseMode.Markdown,
            replyMarkup: result.Success && result.Account is not null
                ? BotKeyboards.MainMenu(result.Account.Role)
                : BotKeyboards.LoginContact(),
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
        var account = await staffRepository.FindAccountByTelegramUserIdAsync(telegramUserId, cancellationToken);

        if (account is null)
        {
            await botClient.AnswerCallbackQuery(query.Id, "Спочатку увійдіть через /start", cancellationToken: cancellationToken);
            return;
        }

        await staffRepository.TouchLastSeenAsync(telegramUserId, cancellationToken);
        var data = query.Data ?? string.Empty;

        try
        {
            await RouteCallbackAsync(chatId, account, data, cancellationToken);
            await botClient.AnswerCallbackQuery(query.Id, cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Callback failed: {Data}", data);
            await botClient.AnswerCallbackQuery(query.Id, "Помилка. Спробуйте ще раз.", cancellationToken: cancellationToken);
        }
    }

    private async Task RouteCallbackAsync(
        long chatId,
        TelegramAccountDto account,
        string data,
        CancellationToken cancellationToken)
    {
        if (data == BotCallbacks.MenuHome)
        {
            sessions.Clear(account.TelegramUserId);
            await SendMainMenuAsync(chatId, account, cancellationToken);
            return;
        }

        if (data == BotCallbacks.MenuAvailable)
        {
            await SendAvailableOrdersAsync(chatId, account, cancellationToken);
            return;
        }

        if (data == BotCallbacks.MenuMyOrders)
        {
            await SendMyOrdersAsync(chatId, account, cancellationToken);
            return;
        }

        if (data == BotCallbacks.MenuStats)
        {
            await SendStatsAsync(chatId, account, cancellationToken);
            return;
        }

        if (data == BotCallbacks.MenuLogs && account.Role == UserRole.Admin)
        {
            await SendLogsAsync(chatId, cancellationToken);
            return;
        }

        if (data == BotCallbacks.MenuEmployees && account.Role == UserRole.Admin)
        {
            await SendEmployeesAsync(chatId, account, cancellationToken);
            return;
        }

        if (data == BotCallbacks.MenuBroadcast && account.Role == UserRole.Admin)
        {
            var session = sessions.GetOrCreate(account.TelegramUserId);
            session.Mode = UserSessionMode.AwaitingBroadcast;
            await botClient.SendMessage(
                chatId,
                "📢 Напишіть повідомлення для *всіх працівників* одним текстом:",
                parseMode: ParseMode.Markdown,
                cancellationToken: cancellationToken);
            return;
        }

        if (data.StartsWith("c:", StringComparison.Ordinal))
        {
            var orderIdText = data[2..];
            if (BotCallbacks.TryParseGuid(orderIdText, out var orderId))
            {
                await ClaimOrderAsync(chatId, account, orderId, cancellationToken);
            }

            return;
        }

        if (data.StartsWith("o:", StringComparison.Ordinal))
        {
            var orderIdText = data[2..];
            if (BotCallbacks.TryParseGuid(orderIdText, out var orderId))
            {
                await ShowOrderAsync(chatId, account, orderId, cancellationToken);
            }

            return;
        }

        if (data.StartsWith("s:", StringComparison.Ordinal))
        {
            var parts = data.Split(':');
            if (parts.Length == 3 &&
                BotCallbacks.TryParseGuid(parts[1], out var orderId) &&
                int.TryParse(parts[2], out var code))
            {
                var status = code switch
                {
                    0 => nameof(OrderStatus.PendingConfirmation),
                    1 => nameof(OrderStatus.Confirmed),
                    2 => nameof(OrderStatus.Completed),
                    _ => string.Empty,
                };

                if (!string.IsNullOrEmpty(status))
                {
                    await UpdateStatusAsync(chatId, account, orderId, status, cancellationToken);
                }
            }

            return;
        }

        if (data.StartsWith("e:", StringComparison.Ordinal) && account.Role == UserRole.Admin)
        {
            var userIdText = data[2..];
            if (BotCallbacks.TryParseGuid(userIdText, out var employeeId))
            {
                await ShowEmployeeAsync(chatId, account, employeeId, cancellationToken);
            }

            return;
        }

        if (data.StartsWith("es:", StringComparison.Ordinal) && account.Role == UserRole.Admin)
        {
            var userIdText = data[3..];
            if (BotCallbacks.TryParseGuid(userIdText, out var employeeId))
            {
                var session = sessions.GetOrCreate(account.TelegramUserId);
                session.Mode = UserSessionMode.AwaitingEmployeeShare;
                session.TargetEmployeeId = employeeId;
                await botClient.SendMessage(
                    chatId,
                    "✏️ Введіть нову долю працівника (0–100):",
                    cancellationToken: cancellationToken);
            }

            return;
        }

        if (data.StartsWith("et:", StringComparison.Ordinal) && account.Role == UserRole.Admin)
        {
            var userIdText = data[3..];
            if (BotCallbacks.TryParseGuid(userIdText, out var employeeId))
            {
                var employees = await staffService.GetEmployeesAsync(cancellationToken);
                var employee = employees.FirstOrDefault(item => item.UserId == employeeId);
                if (employee is null)
                {
                    return;
                }

                var enable = !(employee.CanAcceptOrders && employee.SharePercent > 0);
                var result = await staffService.SetEmployeeAcceptAsync(account.UserId, employeeId, enable, cancellationToken);
                await botClient.SendMessage(chatId, result.Message, cancellationToken: cancellationToken);
                await ShowEmployeeAsync(chatId, account, employeeId, cancellationToken);
            }
        }
    }

    private async Task ClaimOrderAsync(
        long chatId,
        TelegramAccountDto account,
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var result = await staffService.ClaimOrderAsync(account.UserId, orderId, cancellationToken);
        await botClient.SendMessage(
            chatId,
            result.Message,
            parseMode: ParseMode.Markdown,
            replyMarkup: result.Success && result.Order is not null
                ? BotKeyboards.OrderActions(result.Order, account.Role, account.UserId, true)
                : BotKeyboards.MainMenu(account.Role),
            cancellationToken: cancellationToken);

        if (result.Success && result.Order is not null)
        {
            await botClient.SendMessage(
                chatId,
                BotMessages.OrderCard(result.Order),
                parseMode: ParseMode.Markdown,
                replyMarkup: BotKeyboards.OrderActions(result.Order, account.Role, account.UserId, true),
                cancellationToken: cancellationToken);
        }
    }

    private async Task ShowOrderAsync(
        long chatId,
        TelegramAccountDto account,
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var order = await staffService.GetOrderDetailsAsync(account.UserId, orderId, cancellationToken);
        if (order is null)
        {
            await botClient.SendMessage(chatId, "Замовлення недоступне.", cancellationToken: cancellationToken);
            return;
        }

        var assignment = await staffRepository.GetOrderAssignmentAsync(orderId, cancellationToken);
        var isAssignee = assignment?.EmployeeUserId == account.UserId;

        await botClient.SendMessage(
            chatId,
            BotMessages.OrderCard(order),
            parseMode: ParseMode.Markdown,
            replyMarkup: BotKeyboards.OrderActions(order, account.Role, account.UserId, isAssignee),
            cancellationToken: cancellationToken);
    }

    private async Task UpdateStatusAsync(
        long chatId,
        TelegramAccountDto account,
        Guid orderId,
        string status,
        CancellationToken cancellationToken)
    {
        var result = await staffService.UpdateOrderStatusAsync(account.UserId, orderId, status, cancellationToken);
        await botClient.SendMessage(
            chatId,
            result.Message,
            cancellationToken: cancellationToken);

        if (result.Order is not null)
        {
            var assignment = await staffRepository.GetOrderAssignmentAsync(orderId, cancellationToken);
            var isAssignee = assignment?.EmployeeUserId == account.UserId;
            await botClient.SendMessage(
                chatId,
                BotMessages.OrderCard(result.Order),
                parseMode: ParseMode.Markdown,
                replyMarkup: BotKeyboards.OrderActions(result.Order, account.Role, account.UserId, isAssignee),
                cancellationToken: cancellationToken);
        }
    }

    private async Task SendUnauthorizedAsync(long chatId, CancellationToken cancellationToken) =>
        await botClient.SendMessage(
            chatId,
            BotMessages.WelcomeUnauthorized(),
            parseMode: ParseMode.Markdown,
            replyMarkup: BotKeyboards.LoginContact(),
            cancellationToken: cancellationToken);

    private async Task SendMainMenuAsync(long chatId, TelegramAccountDto account, CancellationToken cancellationToken) =>
        await botClient.SendMessage(
            chatId,
            BotMessages.MainMenu(account),
            parseMode: ParseMode.Markdown,
            replyMarkup: BotKeyboards.MainMenu(account.Role),
            cancellationToken: cancellationToken);

    private async Task SendAvailableOrdersAsync(long chatId, TelegramAccountDto account, CancellationToken cancellationToken)
    {
        var orders = await staffService.GetAvailableOrdersAsync(account.UserId, cancellationToken);
        var text = orders.Count == 0
            ? BotMessages.EmptyList("Немає доступних замовлень 🎉")
            : "🆕 *Доступні замовлення*\n\nОберіть, щоб одразу взяти:";

        await botClient.SendMessage(
            chatId,
            text,
            parseMode: ParseMode.Markdown,
            replyMarkup: BotKeyboards.AvailableOrders(orders),
            cancellationToken: cancellationToken);
    }

    private async Task SendMyOrdersAsync(long chatId, TelegramAccountDto account, CancellationToken cancellationToken)
    {
        var orders = await staffService.GetMyOrdersAsync(account.UserId, cancellationToken);
        var text = orders.Count == 0
            ? BotMessages.EmptyList("Активних замовлень немає")
            : "📋 *Ваші активні замовлення*";

        await botClient.SendMessage(
            chatId,
            text,
            parseMode: ParseMode.Markdown,
            replyMarkup: BotKeyboards.MyOrders(orders),
            cancellationToken: cancellationToken);
    }

    private async Task SendStatsAsync(long chatId, TelegramAccountDto account, CancellationToken cancellationToken)
    {
        if (account.Role == UserRole.Admin)
        {
            await botClient.SendMessage(
                chatId,
                "📊 Статистика зарплат доступна для працівників. Перегляньте *Логи* або *Працівників*.",
                parseMode: ParseMode.Markdown,
                replyMarkup: BotKeyboards.BackToMenu(),
                cancellationToken: cancellationToken);
            return;
        }
        var stats = await staffService.GetEmployeeStatsAsync(account.UserId, cancellationToken);
        await botClient.SendMessage(
            chatId,
            BotMessages.Stats(stats),
            parseMode: ParseMode.Markdown,
            replyMarkup: BotKeyboards.BackToMenu(),
            cancellationToken: cancellationToken);
    }

    private async Task SendLogsAsync(long chatId, CancellationToken cancellationToken)
    {
        var logs = await staffService.GetAuditLogsAsync(20, cancellationToken);
        await botClient.SendMessage(
            chatId,
            BotMessages.AuditLogs(logs),
            parseMode: ParseMode.Markdown,
            replyMarkup: BotKeyboards.BackToMenu(),
            cancellationToken: cancellationToken);
    }

    private async Task SendEmployeesAsync(long chatId, TelegramAccountDto account, CancellationToken cancellationToken)
    {
        var employees = await staffService.GetEmployeesAsync(cancellationToken);
        await botClient.SendMessage(
            chatId,
            BotMessages.Employees(employees),
            parseMode: ParseMode.Markdown,
            replyMarkup: BotKeyboards.Employees(employees),
            cancellationToken: cancellationToken);
    }

    private async Task ShowEmployeeAsync(
        long chatId,
        TelegramAccountDto account,
        Guid employeeId,
        CancellationToken cancellationToken)
    {
        var employees = await staffService.GetEmployeesAsync(cancellationToken);
        var employee = employees.FirstOrDefault(item => item.UserId == employeeId);
        if (employee is null)
        {
            await botClient.SendMessage(chatId, "Працівника не знайдено.", cancellationToken: cancellationToken);
            return;
        }

        await botClient.SendMessage(
            chatId,
            BotMessages.EmployeeDetails(employee),
            parseMode: ParseMode.Markdown,
            replyMarkup: BotKeyboards.EmployeeAdmin(employee),
            cancellationToken: cancellationToken);
    }
}
