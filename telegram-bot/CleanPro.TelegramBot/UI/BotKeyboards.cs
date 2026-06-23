using LearnCSharp.Application.DTOs.Telegram;
using LearnCSharp.Domain.Enums;
using Telegram.Bot.Types.ReplyMarkups;

namespace CleanPro.TelegramBot.UI;

public static class BotLabels
{
    public const string Available = "🆕 Доступні замовлення";
    public const string MyOrders = "📋 Мої замовлення";
    public const string Stats = "📊 Моя статистика";
    public const string Admin = "⚙️ Адмін-панель";
    public const string Employees = "👥 Керування працівниками";
    public const string Logs = "📜 Журнал подій";
    public const string Broadcast = "📢 Розсилка працівникам";
    public const string Back = "◀️ Назад";
    public const string Claim = "✅ Прийняти";
    public const string Complete = "🏁 Виконано";
    public const string ChangeShare = "✏️ Змінити долю";
    public const string EnableAccept = "🟢 Увімкнути прийом";
    public const string DisableAccept = "🔴 Вимкнути прийом";

    public const string LogsToday = "📅 Сьогодні";
    public const string LogsYesterday = "📅 Вчора";
    public const string Logs7Days = "📅 7 днів";
    public const string LogsMonth = "📅 Місяць";
    public const string LogsNext = "⏭ Наступні 10";
    public const string LogsPrev = "⏮ Попередні 10";
    public const string LogsChangePeriod = "🗓 Змінити період";

    public const int LogsPageSize = 10;

    public static string AvailableOrderLabel(StaffOrderDto order) =>
        $"🆕 {Trim(GetOrderMenuTitle(order), 28)} · {FormatKyivTime(order.CreatedAtUtc)}";

    public static string MyOrderLabel(StaffOrderDto order) =>
        $"📋 №{order.ShortId} · {StatusEmoji(order.Status)}";

    public static string EmployeeLabel(EmployeeListItemDto employee) =>
        $"{(employee.CanAcceptOrders && employee.SharePercent > 0 ? "🟢" : "🔴")} {Trim(employee.Name, 28)}";

    public static bool TryParseOrderShortId(string text, out string shortId)
    {
        shortId = string.Empty;
        if (string.IsNullOrWhiteSpace(text))
        {
            return false;
        }

        var markerIndex = text.IndexOf('№');
        if (markerIndex < 0)
        {
            return false;
        }

        var rest = text[(markerIndex + 1)..].TrimStart();
        var endIndex = rest.IndexOf('·');
        shortId = (endIndex >= 0 ? rest[..endIndex] : rest).Trim();
        return shortId.Length >= 8;
    }

    private static string StatusEmoji(string status) => status switch
    {
        nameof(OrderStatus.PendingConfirmation) => "⏳",
        nameof(OrderStatus.Confirmed) => "✅",
        nameof(OrderStatus.Completed) => "🏁",
        _ => "•",
    };

    private static string Trim(string value, int max) =>
        value.Length <= max ? value : value[..(max - 1)] + "…";

    private static string GetOrderMenuTitle(StaffOrderDto order) =>
        order.OrderType.Equals("custom", StringComparison.OrdinalIgnoreCase)
            ? "Кастомне прибирання"
            : order.ServiceTitle;

    private static string FormatKyivTime(DateTime utc)
    {
        var kyivZone = TimeZoneInfo.FindSystemTimeZoneById(
            OperatingSystem.IsWindows() ? "FLE Standard Time" : "Europe/Kyiv");

        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), kyivZone)
            .ToString("dd.MM HH:mm");
    }
}

public static class BotKeyboards
{
    public const string CancelLabel = "❌ Відмінити";

    public static ReplyKeyboardMarkup LoginContact() =>
        new([
            [KeyboardButton.WithRequestContact("📱 Надіслати мій номер")],
        ])
        {
            ResizeKeyboard = true,
            OneTimeKeyboard = true,
        };

    public static ReplyKeyboardMarkup CancelOnly() =>
        new([
            [CancelLabel],
            [BotLabels.Back],
        ])
        {
            ResizeKeyboard = true,
        };

    public static ReplyKeyboardMarkup MainMenuReply(UserRole role)
    {
        var rows = new List<KeyboardButton[]>
        {
            new[] { new KeyboardButton(BotLabels.Available) },
            new[] { new KeyboardButton(BotLabels.MyOrders) },
            new[] { new KeyboardButton(BotLabels.Stats) },
        };

        if (role == UserRole.Admin)
        {
            rows.Add(new[] { new KeyboardButton(BotLabels.Admin) });
        }

        return new ReplyKeyboardMarkup(rows) { ResizeKeyboard = true };
    }

    public static ReplyKeyboardMarkup AdminMenuReply() =>
        new([
            [new(BotLabels.Employees)],
            [new(BotLabels.Logs)],
            [new(BotLabels.Broadcast)],
            [new(BotLabels.Back)],
        ])
        {
            ResizeKeyboard = true,
        };

    public static ReplyKeyboardMarkup BackReply() =>
        new([
            [new(BotLabels.Back)],
        ])
        {
            ResizeKeyboard = true,
        };

    public static ReplyKeyboardMarkup AvailableOrdersReply(IReadOnlyList<StaffOrderDto> orders)
    {
        var rows = orders
            .Take(8)
            .Select(order => new[] { new KeyboardButton(BotLabels.AvailableOrderLabel(order)) })
            .ToList<KeyboardButton[]>();

        rows.Add([new(BotLabels.Back)]);
        return new ReplyKeyboardMarkup(rows) { ResizeKeyboard = true };
    }

    public static ReplyKeyboardMarkup MyOrdersReply(IReadOnlyList<StaffOrderDto> orders)
    {
        var rows = orders
            .Take(10)
            .Select(order => new[] { new KeyboardButton(BotLabels.MyOrderLabel(order)) })
            .ToList<KeyboardButton[]>();

        rows.Add([new(BotLabels.Back)]);
        return new ReplyKeyboardMarkup(rows) { ResizeKeyboard = true };
    }

    public static ReplyKeyboardMarkup EmployeesReply(IReadOnlyList<EmployeeListItemDto> employees)
    {
        var rows = employees
            .Take(12)
            .Select(employee => new[] { new KeyboardButton(BotLabels.EmployeeLabel(employee)) })
            .ToList<KeyboardButton[]>();

        rows.Add([new(BotLabels.Back)]);
        return new ReplyKeyboardMarkup(rows) { ResizeKeyboard = true };
    }

    public static ReplyKeyboardMarkup EmployeeAdminReply(EmployeeListItemDto employee)
    {
        var toggleLabel = employee.CanAcceptOrders && employee.SharePercent > 0
            ? BotLabels.DisableAccept
            : BotLabels.EnableAccept;

        return new ReplyKeyboardMarkup([
            [new(BotLabels.ChangeShare)],
            [new(toggleLabel)],
            [new(BotLabels.Back)],
        ])
        {
            ResizeKeyboard = true,
        };
    }

    public static ReplyKeyboardMarkup LogsFilterReply() =>
        new([
            [new(BotLabels.LogsToday)],
            [new(BotLabels.LogsYesterday)],
            [new(BotLabels.Logs7Days)],
            [new(BotLabels.LogsMonth)],
            [new(BotLabels.Back)],
        ])
        {
            ResizeKeyboard = true,
        };

    public static ReplyKeyboardMarkup LogsPageReply(bool hasPrevious, bool hasNext)
    {
        var rows = new List<KeyboardButton[]>();

        if (hasPrevious && hasNext)
        {
            rows.Add([new(BotLabels.LogsPrev), new(BotLabels.LogsNext)]);
        }
        else if (hasPrevious)
        {
            rows.Add([new(BotLabels.LogsPrev)]);
        }
        else if (hasNext)
        {
            rows.Add([new(BotLabels.LogsNext)]);
        }

        rows.Add([new(BotLabels.LogsChangePeriod)]);
        rows.Add([new(BotLabels.Back)]);
        return new ReplyKeyboardMarkup(rows) { ResizeKeyboard = true };
    }

    public static ReplyKeyboardMarkup OrderDetailReply(StaffOrderDto order, bool isAssignee)
    {
        var rows = new List<KeyboardButton[]>();

        if (order.Status == nameof(OrderStatus.PendingConfirmation) && string.IsNullOrWhiteSpace(order.AssigneeName))
        {
            rows.Add([new(BotLabels.Claim)]);
        }

        if (order.Status == nameof(OrderStatus.Confirmed) && isAssignee)
        {
            rows.Add([new(BotLabels.Complete)]);
        }

        rows.Add([new(BotLabels.Back)]);
        return new ReplyKeyboardMarkup(rows) { ResizeKeyboard = true };
    }

    /// <summary>Inline-кнопка лише для push-повідомлень про нове замовлення.</summary>
    public static InlineKeyboardMarkup NewOrderClaimInline(Guid orderId) =>
        new([
            [InlineKeyboardButton.WithCallbackData(BotLabels.Claim, BotCallbacks.Claim(orderId))],
        ]);
}

public static class BotCallbacks
{
    public const string MenuHome = "m:home";
    public const string MenuAvailable = "m:avail";
    public const string MenuMyOrders = "m:mine";
    public const string MenuStats = "m:stats";
    public const string MenuAdmin = "m:admin";
    public const string MenuLogs = "m:logs";
    public const string MenuEmployees = "m:emps";
    public const string MenuBroadcast = "m:bc";

    public static string Claim(Guid orderId) => $"c:{orderId:N}";

    public static string OpenOrder(Guid orderId) => $"o:{orderId:N}";

    public static string SetStatus(Guid orderId, int statusCode) => $"s:{orderId:N}:{statusCode}";

    public static string Employee(Guid userId) => $"e:{userId:N}";

    public static string EmployeeShare(Guid userId) => $"es:{userId:N}";

    public static string EmployeeToggle(Guid userId) => $"et:{userId:N}";

    public static bool TryParseGuid(string value, out Guid id)
    {
        id = default;
        return Guid.TryParseExact(value, "N", out id);
    }
}
