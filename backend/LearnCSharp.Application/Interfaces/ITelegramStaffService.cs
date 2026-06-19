using LearnCSharp.Application.DTOs.Telegram;

namespace LearnCSharp.Application.Interfaces;

public interface ITelegramStaffService
{
    Task<LinkTelegramResult> LinkByContactAsync(
        long telegramUserId,
        long chatId,
        string contactPhone,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StaffOrderDto>> GetAvailableOrdersAsync(
        Guid actorUserId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StaffOrderDto>> GetMyOrdersAsync(
        Guid actorUserId,
        CancellationToken cancellationToken = default);

    Task<StaffOrderActionResult> ClaimOrderAsync(
        Guid actorUserId,
        Guid orderId,
        CancellationToken cancellationToken = default);

    Task<StaffOrderActionResult> UpdateOrderStatusAsync(
        Guid actorUserId,
        Guid orderId,
        string targetStatus,
        CancellationToken cancellationToken = default);

    Task<StaffOrderDto?> GetOrderDetailsAsync(
        Guid actorUserId,
        Guid orderId,
        CancellationToken cancellationToken = default);

    Task<EmployeeStatsDto> GetEmployeeStatsAsync(
        Guid employeeUserId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StaffAuditLogDto>> GetAuditLogsAsync(
        int limit = 30,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<EmployeeListItemDto>> GetEmployeesAsync(
        CancellationToken cancellationToken = default);

    Task<(bool Success, string Message)> SetEmployeeShareAsync(
        Guid adminUserId,
        Guid employeeUserId,
        decimal sharePercent,
        CancellationToken cancellationToken = default);

    Task<(bool Success, string Message)> SetEmployeeAcceptAsync(
        Guid adminUserId,
        Guid employeeUserId,
        bool canAccept,
        CancellationToken cancellationToken = default);

    Task<(bool Success, string Message)> QueueBroadcastAsync(
        Guid adminUserId,
        string message,
        CancellationToken cancellationToken = default);

    Task NotifyNewOrderAsync(Guid orderId, CancellationToken cancellationToken = default);
}
