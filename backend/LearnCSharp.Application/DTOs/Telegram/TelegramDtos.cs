using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Application.DTOs.Telegram;

public sealed class TelegramAccountDto
{
    public Guid UserId { get; init; }

    public required string Name { get; init; }

    public UserRole Role { get; init; }

    public long TelegramUserId { get; init; }

    public long ChatId { get; init; }
}

public sealed class EmployeeProfileDto
{
    public decimal SharePercent { get; init; }

    public bool CanAcceptOrders { get; init; }
}

public sealed class EmployeeListItemDto
{
    public Guid UserId { get; init; }

    public required string Name { get; init; }

    public required string Phone { get; init; }

    public decimal SharePercent { get; init; }

    public bool CanAcceptOrders { get; init; }

    public bool IsLinkedToTelegram { get; init; }
}

public sealed class OrderAssignmentDto
{
    public Guid OrderId { get; init; }

    public Guid EmployeeUserId { get; init; }

    public required string EmployeeName { get; init; }

    public DateTime ClaimedAtUtc { get; init; }
}

public sealed class StaffAuditLogDto
{
    public Guid Id { get; init; }

    public required string ActorName { get; init; }

    public StaffAuditAction Action { get; init; }

    public required string Details { get; init; }

    public Guid? OrderId { get; init; }

    public DateTime CreatedAtUtc { get; init; }
}

public sealed class TelegramOutboxDto
{
    public Guid Id { get; init; }

    public TelegramOutboxType Type { get; init; }

    public required string PayloadJson { get; init; }
}

public sealed class TelegramOrderNotificationDto
{
    public long ChatId { get; init; }

    public int MessageId { get; init; }
}

public sealed class StaffOrderActionResult
{
    public bool Success { get; init; }

    public required string Message { get; init; }

    public StaffOrderDto? Order { get; init; }
}

public sealed class StaffOrderDto
{
    public Guid Id { get; init; }

    public required string ShortId { get; init; }

    public required string Status { get; init; }

    public required string ServiceTitle { get; init; }

    public required string CustomerName { get; init; }

    public required string CustomerPhone { get; init; }

    public string? Address { get; init; }

    public required string TimeSlotLabel { get; init; }

    public required string PaymentMethod { get; init; }

    public int PayableAmount { get; init; }

    public string? Notes { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public string? AssigneeName { get; init; }
}

public sealed class EmployeeStatsDto
{
    public int TodayCount { get; init; }

    public int WeekCount { get; init; }

    public int MonthCount { get; init; }

    public int AllTimeCount { get; init; }

    public int CardPayoutAmount { get; init; }

    public int CashEmployeeAmount { get; init; }

    public int CashCompanyAmount { get; init; }

    public decimal SharePercent { get; init; }
}

public sealed class NewOrderOutboxPayload
{
    public Guid OrderId { get; init; }
}

public sealed class OrderClaimedOutboxPayload
{
    public Guid OrderId { get; init; }

    public required string AssigneeName { get; init; }
}

public sealed class StaffBroadcastOutboxPayload
{
    public required string Message { get; init; }

    public Guid AdminUserId { get; init; }
}

public sealed class LinkTelegramResult
{
    public bool Success { get; init; }

    public required string Message { get; init; }

    public TelegramAccountDto? Account { get; init; }
}
