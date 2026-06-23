using System.Text.Json;
using LearnCSharp.Application.DTOs.Telegram;
using LearnCSharp.Application.Helpers;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Application.Orders;
using LearnCSharp.Application.Validation;
using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Application.Services;

public sealed class TelegramStaffService(
    ITelegramStaffRepository repository,
    IUserRepository userRepository) : ITelegramStaffService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<LinkTelegramResult> LinkByContactAsync(
        long telegramUserId,
        long chatId,
        string contactPhone,
        CancellationToken cancellationToken = default)
    {
        if (!AuthValidator.TryNormalizePhone(contactPhone, out var normalizedPhone))
        {
            return FailLink("Не вдалося прочитати номер телефону з Telegram.");
        }

        var user = await userRepository.FindByPhoneAsync(normalizedPhone, cancellationToken);
        if (user is null)
        {
            return FailLink(
                "Цей номер не знайдено в системі Smart Clean. Зверніться до адміністратора.");
        }

        if (user.Role is not (UserRole.Admin or UserRole.Employee))
        {
            return FailLink("Бот доступний лише для працівників та адміністраторів.");
        }

        if (user.Role == UserRole.Employee)
        {
            await repository.EnsureEmployeeProfileAsync(user.Id, cancellationToken);
        }

        await repository.LinkAccountAsync(
            user.Id,
            telegramUserId,
            chatId,
            normalizedPhone,
            cancellationToken);

        await repository.AddAuditLogAsync(
            user.Id,
            StaffAuditAction.TelegramLinked,
            $"Підключено Telegram для {user.Name} ({normalizedPhone}).",
            cancellationToken: cancellationToken);

        var account = await repository.FindAccountByTelegramUserIdAsync(telegramUserId, cancellationToken);

        var roleLabel = user.Role == UserRole.Admin ? "адміністратор" : "працівник";
        var extra = user.Role == UserRole.Employee
            ? await BuildEmployeeWelcomeAsync(user.Id, cancellationToken)
            : string.Empty;

        return new LinkTelegramResult
        {
            Success = true,
            Message = $"✅ Вітаємо, {user.Name}! Ви увійшли як {roleLabel}.{extra}",
            Account = account,
        };
    }

    public async Task<IReadOnlyList<StaffOrderDto>> GetAvailableOrdersAsync(
        Guid actorUserId,
        CancellationToken cancellationToken = default)
    {
        var actor = await userRepository.FindByIdAsync(actorUserId, cancellationToken);
        if (actor is null || actor.Role is UserRole.User)
        {
            return [];
        }

        var orders = await repository.GetUnclaimedPendingOrdersAsync(cancellationToken);
        var result = new List<StaffOrderDto>();

        foreach (var order in orders)
        {
            result.Add(await MapOrderAsync(order, cancellationToken));
        }

        return result;
    }

    public async Task<IReadOnlyList<StaffOrderDto>> GetMyOrdersAsync(
        Guid actorUserId,
        CancellationToken cancellationToken = default)
    {
        var actor = await userRepository.FindByIdAsync(actorUserId, cancellationToken);
        if (actor is null || actor.Role is UserRole.User)
        {
            return [];
        }

        IReadOnlyList<Domain.Entities.Order> orders =
            await repository.GetOrdersAssignedToAsync(actorUserId, cancellationToken);

        var result = new List<StaffOrderDto>();
        foreach (var order in orders)
        {
            result.Add(await MapOrderAsync(order, cancellationToken));
        }

        return result;
    }

    public async Task<StaffOrderActionResult> ClaimOrderAsync(
        Guid actorUserId,
        Guid orderId,
        CancellationToken cancellationToken = default)
    {
        var actor = await userRepository.FindByIdAsync(actorUserId, cancellationToken);
        if (actor is null || actor.Role is UserRole.User)
        {
            return FailAction("Недостатньо прав.");
        }

        if (actor.Role == UserRole.Employee)
        {
            var profile = await repository.GetEmployeeProfileAsync(actorUserId, cancellationToken);
            if (profile is null || !profile.CanAcceptOrders || profile.SharePercent <= 0)
            {
                return FailAction(
                    "Ви ще не можете приймати замовлення. Зверніться до адміністратора — потрібно увімкнути доступ і встановити вашу долю.");
            }
        }

        var order = await repository.FindOrderByIdAsync(orderId, cancellationToken);
        if (order is null)
        {
            return FailAction("Замовлення не знайдено.");
        }

        if (order.Status != OrderStatus.PendingConfirmation)
        {
            return FailAction("Це замовлення вже обробляється.");
        }

        var existing = await repository.GetOrderAssignmentAsync(orderId, cancellationToken);
        if (existing is not null)
        {
            return FailAction($"Замовлення вже взято: {existing.EmployeeName}.");
        }

        var claimed = await repository.TryClaimOrderAsync(orderId, actorUserId, cancellationToken);
        if (!claimed)
        {
            var assignment = await repository.GetOrderAssignmentAsync(orderId, cancellationToken);
            return FailAction(
                assignment is null
                    ? "Не вдалося взяти замовлення. Спробуйте ще раз."
                    : $"Замовлення вже взято: {assignment.EmployeeName}.");
        }

        order.Status = OrderStatus.Confirmed;
        order.UpdatedAtUtc = DateTime.UtcNow;
        await repository.UpdateOrderAsync(order, cancellationToken);

        var shortId = order.Id.ToString()[..8].ToUpperInvariant();
        await repository.AddAuditLogAsync(
            actorUserId,
            StaffAuditAction.OrderClaimed,
            $"{actor.Name} взяв(ла) замовлення №{shortId} о {FormatLocalTime(DateTime.UtcNow)}.",
            orderId,
            cancellationToken);

        await repository.EnqueueOutboxAsync(
            TelegramOutboxType.OrderClaimed,
            JsonSerializer.Serialize(new OrderClaimedOutboxPayload
            {
                OrderId = orderId,
                AssigneeName = actor.Name,
            }, JsonOptions),
            cancellationToken);

        return new StaffOrderActionResult
        {
            Success = true,
            Message = "✅ Замовлення ваше! Статус: підтверджено.",
            Order = await MapOrderAsync(order, cancellationToken),
        };
    }

    public async Task<StaffOrderActionResult> UpdateOrderStatusAsync(
        Guid actorUserId,
        Guid orderId,
        string targetStatus,
        CancellationToken cancellationToken = default)
    {
        var actor = await userRepository.FindByIdAsync(actorUserId, cancellationToken);
        if (actor is null || actor.Role is UserRole.User)
        {
            return FailAction("Недостатньо прав.");
        }

        if (!Enum.TryParse<OrderStatus>(targetStatus, ignoreCase: true, out var status))
        {
            return FailAction("Невідомий статус.");
        }

        var order = await repository.FindOrderByIdAsync(orderId, cancellationToken);
        if (order is null)
        {
            return FailAction("Замовлення не знайдено.");
        }

        var assignment = await repository.GetOrderAssignmentAsync(orderId, cancellationToken);

        if (actor.Role == UserRole.Employee)
        {
            if (assignment?.EmployeeUserId != actorUserId)
            {
                return FailAction("Це не ваше замовлення.");
            }

            if (status != OrderStatus.Completed || order.Status != OrderStatus.Confirmed)
            {
                return FailAction("Працівник може лише позначити підтверджене замовлення виконаним.");
            }
        }
        else if (actor.Role == UserRole.Admin)
        {
            var valid = (order.Status, status) switch
            {
                (OrderStatus.PendingConfirmation, OrderStatus.Confirmed) => true,
                (OrderStatus.Confirmed, OrderStatus.Completed) => true,
                (OrderStatus.Confirmed, OrderStatus.PendingConfirmation) => true,
                (OrderStatus.Completed, OrderStatus.Confirmed) => true,
                _ => false,
            };

            if (!valid)
            {
                return FailAction("Недозволений перехід статусу.");
            }
        }

        var previous = order.Status;
        order.Status = status;
        order.UpdatedAtUtc = DateTime.UtcNow;
        await repository.UpdateOrderAsync(order, cancellationToken);

        var shortId = order.Id.ToString()[..8].ToUpperInvariant();
        await repository.AddAuditLogAsync(
            actorUserId,
            StaffAuditAction.OrderStatusChanged,
            $"{actor.Name}: №{shortId} {previous} → {status} о {FormatLocalTime(DateTime.UtcNow)}.",
            orderId,
            cancellationToken);

        var message = status switch
        {
            OrderStatus.Completed => "✅ Замовлення виконано.",
            OrderStatus.Confirmed => "Замовлення підтверджено.",
            OrderStatus.PendingConfirmation => "Замовлення повернено на очікування.",
            _ => "Статус оновлено.",
        };

        return new StaffOrderActionResult
        {
            Success = true,
            Message = message,
            Order = await MapOrderAsync(order, cancellationToken),
        };
    }

    public async Task<StaffOrderDto?> GetOrderDetailsAsync(
        Guid actorUserId,
        Guid orderId,
        CancellationToken cancellationToken = default)
    {
        var order = await repository.FindOrderByIdAsync(orderId, cancellationToken);
        if (order is null)
        {
            return null;
        }

        var actor = await userRepository.FindByIdAsync(actorUserId, cancellationToken);
        if (actor is null || actor.Role is UserRole.User)
        {
            return null;
        }

        if (actor.Role is UserRole.Employee or UserRole.Admin)
        {
            var assignment = await repository.GetOrderAssignmentAsync(orderId, cancellationToken);
            var isAvailable = order.Status == OrderStatus.PendingConfirmation && assignment is null;
            var isMine = assignment?.EmployeeUserId == actorUserId;

            if (!isAvailable && !isMine)
            {
                return null;
            }
        }

        return await MapOrderAsync(order, cancellationToken);
    }

    public async Task<EmployeeStatsDto> GetEmployeeStatsAsync(
        Guid employeeUserId,
        CancellationToken cancellationToken = default)
    {
        var profile = await repository.GetEmployeeProfileAsync(employeeUserId, cancellationToken);
        var share = profile?.SharePercent ?? 0;

        var kyivNow = ToKyivTime(DateTime.UtcNow);
        var todayStart = ToUtc(kyivNow.Date);
        var weekStart = ToUtc(kyivNow.Date.AddDays(-(int)kyivNow.DayOfWeek + (kyivNow.DayOfWeek == DayOfWeek.Sunday ? -6 : 1)));
        var monthStart = ToUtc(new DateTime(kyivNow.Year, kyivNow.Month, 1, 0, 0, 0, DateTimeKind.Unspecified));

        var allCompleted = await repository.GetCompletedOrdersForEmployeeAsync(employeeUserId, null, cancellationToken);
        var today = allCompleted.Where(order => (order.UpdatedAtUtc ?? order.CreatedAtUtc) >= todayStart).ToList();
        var week = allCompleted.Where(order => (order.UpdatedAtUtc ?? order.CreatedAtUtc) >= weekStart).ToList();
        var month = allCompleted.Where(order => (order.UpdatedAtUtc ?? order.CreatedAtUtc) >= monthStart).ToList();

        return new EmployeeStatsDto
        {
            TodayCount = today.Count,
            WeekCount = week.Count,
            MonthCount = month.Count,
            AllTimeCount = allCompleted.Count,
            SharePercent = share,
            CardPayoutAmount = SumEmployeeShare(allCompleted.Where(o => o.PaymentMethod == "card"), share),
            CashEmployeeAmount = SumEmployeeShare(allCompleted.Where(o => o.PaymentMethod == "cash"), share),
            CashCompanyAmount = SumCompanyShare(allCompleted.Where(o => o.PaymentMethod == "cash"), share),
        };
    }

    public Task<IReadOnlyList<StaffAuditLogDto>> GetAuditLogsAsync(
        int limit = 30,
        CancellationToken cancellationToken = default) =>
        repository.GetRecentAuditLogsAsync(limit, cancellationToken);

    public async Task<StaffAuditLogsPageDto> GetAuditLogsPageAsync(
        StaffAuditLogPeriod period,
        int page,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var safePage = Math.Max(0, page);
        var safePageSize = Math.Clamp(pageSize, 1, 50);
        var (fromUtc, toUtcExclusive, label) = StaffAuditLogPeriodHelper.GetUtcRange(period);
        var (items, totalCount) = await repository.GetAuditLogsPageAsync(
            fromUtc,
            toUtcExclusive,
            safePage * safePageSize,
            safePageSize,
            cancellationToken);

        return new StaffAuditLogsPageDto
        {
            PeriodLabel = label,
            Items = items,
            TotalCount = totalCount,
            Page = safePage,
            PageSize = safePageSize,
        };
    }

    public Task<IReadOnlyList<EmployeeListItemDto>> GetEmployeesAsync(
        CancellationToken cancellationToken = default) =>
        repository.GetEmployeesAsync(cancellationToken);

    public async Task<(bool Success, string Message)> SetEmployeeShareAsync(
        Guid adminUserId,
        Guid employeeUserId,
        decimal sharePercent,
        CancellationToken cancellationToken = default)
    {
        if (!await IsAdminAsync(adminUserId, cancellationToken))
        {
            return (false, "Лише адміністратор може змінювати долю.");
        }

        if (sharePercent is < 0 or > 100)
        {
            return (false, "Доля має бути від 0 до 100%.");
        }

        var employee = await userRepository.FindByIdAsync(employeeUserId, cancellationToken);
        if (employee is null || employee.Role != UserRole.Employee)
        {
            return (false, "Працівника не знайдено.");
        }

        var profile = await repository.GetEmployeeProfileAsync(employeeUserId, cancellationToken);
        await repository.UpdateEmployeeProfileAsync(
            employeeUserId,
            sharePercent,
            profile?.CanAcceptOrders ?? false,
            cancellationToken);

        var admin = await userRepository.FindByIdAsync(adminUserId, cancellationToken);
        await repository.AddAuditLogAsync(
            adminUserId,
            StaffAuditAction.EmployeeShareUpdated,
            $"{admin?.Name}: доля {employee.Name} → {sharePercent:0.#}%.",
            cancellationToken: cancellationToken);

        return (true, $"Долю {employee.Name} оновлено: {sharePercent:0.#}%.");
    }

    public async Task<(bool Success, string Message)> SetEmployeeAcceptAsync(
        Guid adminUserId,
        Guid employeeUserId,
        bool canAccept,
        CancellationToken cancellationToken = default)
    {
        if (!await IsAdminAsync(adminUserId, cancellationToken))
        {
            return (false, "Лише адміністратор може керувати доступом.");
        }

        var employee = await userRepository.FindByIdAsync(employeeUserId, cancellationToken);
        if (employee is null || employee.Role != UserRole.Employee)
        {
            return (false, "Працівника не знайдено.");
        }

        var profile = await repository.GetEmployeeProfileAsync(employeeUserId, cancellationToken);
        var share = profile?.SharePercent ?? 0;

        if (canAccept && share <= 0)
        {
            return (false, "Спочатку встановіть долю більше 0%.");
        }

        await repository.UpdateEmployeeProfileAsync(employeeUserId, share, canAccept, cancellationToken);

        var admin = await userRepository.FindByIdAsync(adminUserId, cancellationToken);
        await repository.AddAuditLogAsync(
            adminUserId,
            canAccept ? StaffAuditAction.EmployeeAcceptEnabled : StaffAuditAction.EmployeeAcceptDisabled,
            $"{admin?.Name}: {(canAccept ? "увімкнув" : "вимкнув")} прийом замовлень для {employee.Name}.",
            cancellationToken: cancellationToken);

        return (true, canAccept
            ? $"{employee.Name} тепер може приймати замовлення."
            : $"{employee.Name} більше не може приймати замовлення.");
    }

    public async Task<(bool Success, string Message)> QueueBroadcastAsync(
        Guid adminUserId,
        string message,
        CancellationToken cancellationToken = default)
    {
        if (!await IsAdminAsync(adminUserId, cancellationToken))
        {
            return (false, "Лише адміністратор може робити розсилку.");
        }

        if (string.IsNullOrWhiteSpace(message))
        {
            return (false, "Повідомлення не може бути порожнім.");
        }

        await repository.EnqueueOutboxAsync(
            TelegramOutboxType.StaffBroadcast,
            JsonSerializer.Serialize(new StaffBroadcastOutboxPayload
            {
                AdminUserId = adminUserId,
                Message = message.Trim(),
            }, JsonOptions),
            cancellationToken);

        var admin = await userRepository.FindByIdAsync(adminUserId, cancellationToken);
        await repository.AddAuditLogAsync(
            adminUserId,
            StaffAuditAction.StaffBroadcast,
            $"{admin?.Name}: розсилка «{Truncate(message.Trim(), 120)}».",
            cancellationToken: cancellationToken);

        return (true, "Розсилку поставлено в чергу.");
    }

    public Task NotifyNewOrderAsync(Guid orderId, CancellationToken cancellationToken = default) =>
        repository.EnqueueOutboxAsync(
            TelegramOutboxType.NewOrder,
            JsonSerializer.Serialize(new NewOrderOutboxPayload { OrderId = orderId }, JsonOptions),
            cancellationToken);

    private async Task<StaffOrderDto> MapOrderAsync(
        Domain.Entities.Order order,
        CancellationToken cancellationToken)
    {
        var assignment = await repository.GetOrderAssignmentAsync(order.Id, cancellationToken);

        return new StaffOrderDto
        {
            Id = order.Id,
            ShortId = order.Id.ToString()[..8].ToUpperInvariant(),
            Status = order.Status.ToString(),
            ServiceTitle = order.ServiceTitle,
            OrderType = order.OrderType,
            CustomerName = order.User?.Name ?? "Клієнт",
            CustomerPhone = order.User?.Phone ?? "—",
            Address = order.Address,
            TimeSlotLabel = order.TimeSlotLabel,
            PaymentMethod = order.PaymentMethod,
            PayableAmount = order.PayableAmount,
            Notes = order.Notes,
            SelectedAddons = OrderAddonsJson.Deserialize(order.SelectedAddonsJson),
            CreatedAtUtc = order.CreatedAtUtc,
            AssigneeName = assignment?.EmployeeName,
        };
    }

    private async Task<string> BuildEmployeeWelcomeAsync(Guid userId, CancellationToken cancellationToken)
    {
        var profile = await repository.GetEmployeeProfileAsync(userId, cancellationToken);
        if (profile is null)
        {
            return "\n\nМій процент від замовлення: 0%. Доступ до замовлень вимкнено — зверніться до адміна.";
        }

        var access = profile.CanAcceptOrders && profile.SharePercent > 0
            ? "можете приймати замовлення"
            : "поки не можете приймати замовлення — зверніться до адміна";

        return $"\n\nМій процент від замовлення: {profile.SharePercent:0.#}%. Зараз ви {access}.";
    }

    private async Task<bool> IsAdminAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByIdAsync(userId, cancellationToken);
        return user?.Role == UserRole.Admin;
    }

    private static int SumEmployeeShare(IEnumerable<Domain.Entities.Order> orders, decimal sharePercent) =>
        orders.Sum(order => (int)Math.Round(order.PayableAmount * sharePercent / 100m, MidpointRounding.AwayFromZero));

    private static int SumCompanyShare(IEnumerable<Domain.Entities.Order> orders, decimal sharePercent) =>
        orders.Sum(order => order.PayableAmount - (int)Math.Round(order.PayableAmount * sharePercent / 100m, MidpointRounding.AwayFromZero));

    private static LinkTelegramResult FailLink(string message) =>
        new() { Success = false, Message = message };

    private static StaffOrderActionResult FailAction(string message) =>
        new() { Success = false, Message = message };

    private static string FormatLocalTime(DateTime utc) =>
        ToKyivTime(utc).ToString("dd.MM.yyyy HH:mm");

    private static DateTime ToKyivTime(DateTime utc)
    {
        var tz = TimeZoneInfo.TryFindSystemTimeZoneById("Europe/Kyiv", out var kyiv)
            ? kyiv
            : TimeZoneInfo.TryFindSystemTimeZoneById("FLE Standard Time", out var fle)
                ? fle
                : TimeZoneInfo.Utc;

        return TimeZoneInfo.ConvertTimeFromUtc(utc, tz);
    }

    private static DateTime ToUtc(DateTime kyivUnspecified)
    {
        var tz = TimeZoneInfo.TryFindSystemTimeZoneById("Europe/Kyiv", out var kyiv)
            ? kyiv
            : TimeZoneInfo.TryFindSystemTimeZoneById("FLE Standard Time", out var fle)
                ? fle
                : TimeZoneInfo.Utc;

        return TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(kyivUnspecified, DateTimeKind.Unspecified), tz);
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..(max - 1)] + "…";
}
