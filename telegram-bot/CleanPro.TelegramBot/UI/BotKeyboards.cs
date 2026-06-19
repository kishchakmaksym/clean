using LearnCSharp.Application.DTOs.Telegram;
using LearnCSharp.Domain.Enums;
using Telegram.Bot.Types.ReplyMarkups;

namespace CleanPro.TelegramBot.UI;

public static class BotKeyboards
{
    public static ReplyKeyboardMarkup LoginContact() =>
        new([
            [KeyboardButton.WithRequestContact("📱 Надіслати мій номер")],
        ])
        {
            ResizeKeyboard = true,
            OneTimeKeyboard = true,
        };

    public static InlineKeyboardMarkup MainMenu(UserRole role)
    {
        var rows = new List<IEnumerable<InlineKeyboardButton>>
        {
            new[] { InlineKeyboardButton.WithCallbackData("🆕 Доступні", BotCallbacks.MenuAvailable) },
            new[] { InlineKeyboardButton.WithCallbackData("📋 Мої замовлення", BotCallbacks.MenuMyOrders) },
            new[] { InlineKeyboardButton.WithCallbackData("📊 Статистика", BotCallbacks.MenuStats) },
        };

        if (role == UserRole.Admin)
        {
            rows.Add(new[] { InlineKeyboardButton.WithCallbackData("👥 Працівники", BotCallbacks.MenuEmployees) });
            rows.Add(new[] { InlineKeyboardButton.WithCallbackData("📜 Логи", BotCallbacks.MenuLogs) });
            rows.Add(new[] { InlineKeyboardButton.WithCallbackData("📢 Розсилка", BotCallbacks.MenuBroadcast) });
        }

        return new InlineKeyboardMarkup(rows);
    }

    public static InlineKeyboardMarkup AvailableOrders(IReadOnlyList<StaffOrderDto> orders)
    {
        if (orders.Count == 0)
        {
            return BackToMenu();
        }

        var rows = orders
            .Take(8)
            .Select(order => new[]
            {
                InlineKeyboardButton.WithCallbackData(
                    $"🆕 №{order.ShortId} · {Trim(order.ServiceTitle, 24)}",
                    BotCallbacks.Claim(order.Id)),
            })
            .ToList<IEnumerable<InlineKeyboardButton>>();

        rows.Add([InlineKeyboardButton.WithCallbackData("🏠 Меню", BotCallbacks.MenuHome)]);
        return new InlineKeyboardMarkup(rows);
    }

    public static InlineKeyboardMarkup MyOrders(IReadOnlyList<StaffOrderDto> orders)
    {
        if (orders.Count == 0)
        {
            return BackToMenu();
        }

        var rows = orders
            .Take(10)
            .Select(order => new[]
            {
                InlineKeyboardButton.WithCallbackData(
                    $"📋 №{order.ShortId} · {StatusEmoji(order.Status)}",
                    BotCallbacks.OpenOrder(order.Id)),
            })
            .ToList<IEnumerable<InlineKeyboardButton>>();

        rows.Add([InlineKeyboardButton.WithCallbackData("🏠 Меню", BotCallbacks.MenuHome)]);
        return new InlineKeyboardMarkup(rows);
    }

    public static InlineKeyboardMarkup OrderActions(
        StaffOrderDto order,
        UserRole role,
        Guid actorUserId,
        bool isAssignee)
    {
        var rows = new List<IEnumerable<InlineKeyboardButton>>();

        if (order.Status == nameof(OrderStatus.PendingConfirmation) && string.IsNullOrWhiteSpace(order.AssigneeName))
        {
            rows.Add([InlineKeyboardButton.WithCallbackData("✅ Прийняти", BotCallbacks.Claim(order.Id))]);
        }

        if (order.Status == nameof(OrderStatus.Confirmed) && (role == UserRole.Admin || isAssignee))
        {
            rows.Add([
                InlineKeyboardButton.WithCallbackData("🏁 Виконано", BotCallbacks.SetStatus(order.Id, 2)),
            ]);
        }

        if (role == UserRole.Admin)
        {
            if (order.Status == nameof(OrderStatus.Confirmed))
            {
                rows.Add([
                    InlineKeyboardButton.WithCallbackData("↩️ На очікування", BotCallbacks.SetStatus(order.Id, 0)),
                ]);
            }

            if (order.Status == nameof(OrderStatus.Completed))
            {
                rows.Add([
                    InlineKeyboardButton.WithCallbackData("↩️ На підтверджені", BotCallbacks.SetStatus(order.Id, 1)),
                ]);
            }
        }

        rows.Add([InlineKeyboardButton.WithCallbackData("🏠 Меню", BotCallbacks.MenuHome)]);
        return new InlineKeyboardMarkup(rows);
    }

    public static InlineKeyboardMarkup Employees(IReadOnlyList<EmployeeListItemDto> employees)
    {
        var rows = employees
            .Take(12)
            .Select(employee => new[]
            {
                InlineKeyboardButton.WithCallbackData(
                    $"{(employee.CanAcceptOrders && employee.SharePercent > 0 ? "🟢" : "🔴")} {Trim(employee.Name, 28)}",
                    BotCallbacks.Employee(employee.UserId)),
            })
            .ToList<IEnumerable<InlineKeyboardButton>>();

        rows.Add([InlineKeyboardButton.WithCallbackData("🏠 Меню", BotCallbacks.MenuHome)]);
        return new InlineKeyboardMarkup(rows);
    }

    public static InlineKeyboardMarkup EmployeeAdmin(EmployeeListItemDto employee)
    {
        var toggleLabel = employee.CanAcceptOrders && employee.SharePercent > 0
            ? "🔴 Вимкнути прийом"
            : "🟢 Увімкнути прийом";

        return new InlineKeyboardMarkup([
            [InlineKeyboardButton.WithCallbackData("✏️ Змінити долю", BotCallbacks.EmployeeShare(employee.UserId))],
            [InlineKeyboardButton.WithCallbackData(toggleLabel, BotCallbacks.EmployeeToggle(employee.UserId))],
            [InlineKeyboardButton.WithCallbackData("👥 Назад", BotCallbacks.MenuEmployees)],
            [InlineKeyboardButton.WithCallbackData("🏠 Меню", BotCallbacks.MenuHome)],
        ]);
    }

    public static InlineKeyboardMarkup BackToMenu() =>
        new([
            [InlineKeyboardButton.WithCallbackData("🏠 Меню", BotCallbacks.MenuHome)],
        ]);

    private static string StatusEmoji(string status) => status switch
    {
        nameof(OrderStatus.PendingConfirmation) => "⏳",
        nameof(OrderStatus.Confirmed) => "✅",
        nameof(OrderStatus.Completed) => "🏁",
        _ => "•",
    };

    private static string Trim(string value, int max) =>
        value.Length <= max ? value : value[..(max - 1)] + "…";
}

public static class BotCallbacks
{
    public const string MenuHome = "m:home";
    public const string MenuAvailable = "m:avail";
    public const string MenuMyOrders = "m:mine";
    public const string MenuStats = "m:stats";
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
