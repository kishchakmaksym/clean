using LearnCSharp.Application.DTOs.Telegram;
using LearnCSharp.Application.Helpers;
using LearnCSharp.Domain.Enums;
namespace CleanPro.TelegramBot.UI;

public static class BotMessages
{
    public static string WelcomeUnauthorized() => "🧹 *Smart Clean*";

    public static string MainMenu(TelegramAccountDto account) =>
        $"👋 *{Escape(account.Name)}*\n\nОберіть розділ нижче 👇";

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

        💼 Мій процент від замовлення: *{stats.SharePercent:0.#}%*

        💳 До виплати від компанії (картка): *{stats.CardPayoutAmount:N0} ₴*
        💵 Ваша частка готівки: *{stats.CashEmployeeAmount:N0} ₴*
        🏢 До здачі компанії (готівка): *{stats.CashCompanyAmount:N0} ₴*
        """;

    public static string AuditLogsPage(StaffAuditLogsPageDto page)
    {
        if (page.TotalCount == 0)
        {
            return $"📜 *Журнал подій · {Escape(page.PeriodLabel)}*\n\n_За цей період логів немає._";
        }

        var from = page.Page * page.PageSize + 1;
        var to = Math.Min(from + page.Items.Count - 1, page.TotalCount);
        var header =
            $"📜 *Журнал подій · {Escape(page.PeriodLabel)}*\n" +
            $"Показано *{from}–{to}* з *{page.TotalCount}*\n";

        var lines = page.Items.Select(log =>
            $"• `{StaffAuditLogPeriodHelper.FormatKyivTime(log.CreatedAtUtc)}` *{Escape(log.ActorName)}*\n  {Escape(log.Details)}");

        return header + "\n" + string.Join("\n\n", lines);
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
