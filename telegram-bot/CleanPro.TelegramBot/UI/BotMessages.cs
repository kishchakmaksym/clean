using LearnCSharp.Application.DTOs.Telegram;
using LearnCSharp.Domain.Enums;

namespace CleanPro.TelegramBot.UI;

public static class BotMessages
{
    public static string WelcomeUnauthorized() =>
        """
        🧹 *CleanPro — бот для команди*

        Тут працюють лише *працівники* та *адміністратори*.

        Щоб увійти, натисніть кнопку нижче й *надішліть свій контакт*.
        Бот сам візьме номер з вашого Telegram-акаунта — вводити його вручну не можна.
        """;

    public static string MainMenu(TelegramAccountDto account) =>
        account.Role == UserRole.Admin
            ? $"👋 *{Escape(account.Name)}*\n\nОберіть розділ:"
            : $"👋 *{Escape(account.Name)}*\n\nОберіть розділ:";

    public static string OrderCard(StaffOrderDto order, bool showActionsHint = true)
    {
        var payment = order.PaymentMethod == "card" ? "💳 Картка" : "💵 Готівка";
        var status = StatusLabel(order.Status);
        var assignee = string.IsNullOrWhiteSpace(order.AssigneeName)
            ? "—"
            : Escape(order.AssigneeName);

        var text = $"""
            🧾 *Замовлення №{order.ShortId}*
            Статус: *{status}*

            🛠 {Escape(order.ServiceTitle)}
            👤 {Escape(order.CustomerName)}
            📞 `{order.CustomerPhone}`
            📍 {Escape(order.Address ?? "—")}
            🕒 {Escape(order.TimeSlotLabel)}
            {payment} · *{order.PayableAmount:N0} ₴*

            👷 Виконавець: {assignee}

            💬 *Коментар:*
            _{Escape(string.IsNullOrWhiteSpace(order.Notes) ? "коментар відсутній" : order.Notes)}_
            """;

        if (order.SelectedAddons.Count > 0)
        {
            text += "\n\n➕ *Додаткові послуги:*";
            foreach (var addon in order.SelectedAddons)
            {
                text += $"\n• {Escape(addon)}";
            }
        }

        if (showActionsHint)
        {
            text += "\n\nОберіть дію нижче 👇";
        }

        return text;
    }

    public static string NewOrderAlert(StaffOrderDto order) =>
        $"""
        🔔 *Нове замовлення!*

        {OrderCard(order, showActionsHint: false)}

        Хто перший натисне *Прийняти* — той і бере замовлення.
        """;

    public static string OrderClaimedNotice(string assigneeName, StaffOrderDto order) =>
        $"""
        ✅ *Замовлення №{order.ShortId} взято*

        👷 {Escape(assigneeName)}

        {OrderCard(order, showActionsHint: false)}
        """;

    public static string Stats(EmployeeStatsDto stats) =>
        $"""
        📊 *Ваша статистика*

        ✅ Сьогодні: *{stats.TodayCount}*
        📅 Тиждень: *{stats.WeekCount}*
        🗓 Місяць: *{stats.MonthCount}*
        🏆 Усього: *{stats.AllTimeCount}*

        💼 Ваша доля: *{stats.SharePercent:0.#}%*

        💳 До виплати від компанії (картка): *{stats.CardPayoutAmount:N0} ₴*
        💵 Ваша частка готівки: *{stats.CashEmployeeAmount:N0} ₴*
        🏢 До здачі компанії (готівка): *{stats.CashCompanyAmount:N0} ₴*
        """;

    public static string AuditLogs(IReadOnlyList<StaffAuditLogDto> logs)
    {
        if (logs.Count == 0)
        {
            return "📜 Логів поки немає.";
        }

        var lines = logs
            .Take(15)
            .Select(log =>
                $"• `{log.CreatedAtUtc:dd.MM HH:mm}` *{Escape(log.ActorName)}*\n  {Escape(log.Details)}");

        return "📜 *Останні події*\n\n" + string.Join("\n\n", lines);
    }

    public static string Employees(IReadOnlyList<EmployeeListItemDto> employees)
    {
        if (employees.Count == 0)
        {
            return "👥 Працівників поки немає.";
        }

        var lines = employees.Select(employee =>
        {
            var linked = employee.IsLinkedToTelegram ? "📱" : "—";
            var access = employee.CanAcceptOrders && employee.SharePercent > 0 ? "🟢" : "🔴";
            return $"{access} *{Escape(employee.Name)}* · {employee.SharePercent:0.#}% {linked}\n`{employee.Phone}`";
        });

        return "👥 *Працівники*\n\n" + string.Join("\n\n", lines) + "\n\nНатисніть на працівника, щоб керувати.";
    }

    public static string EmployeeDetails(EmployeeListItemDto employee) =>
        $"""
        👤 *{Escape(employee.Name)}*
        📞 `{employee.Phone}`

        Доля: *{employee.SharePercent:0.#}%*
        Прийом замовлень: *{(employee.CanAcceptOrders && employee.SharePercent > 0 ? "увімкнено" : "вимкнено")}*
        Telegram: *{(employee.IsLinkedToTelegram ? "підключено" : "не підключено")}*
        """;

    public static string EmptyList(string title) => $"_{title}_";

    private static string StatusLabel(string status) => status switch
    {
        nameof(OrderStatus.PendingConfirmation) => "⏳ Очікує",
        nameof(OrderStatus.Confirmed) => "✅ Підтверджено",
        nameof(OrderStatus.Completed) => "🏁 Виконано",
        _ => status,
    };

    public static string Escape(string value) =>
        value.Replace("_", "\\_", StringComparison.Ordinal)
            .Replace("*", "\\*", StringComparison.Ordinal)
            .Replace("[", "\\[", StringComparison.Ordinal);
}
