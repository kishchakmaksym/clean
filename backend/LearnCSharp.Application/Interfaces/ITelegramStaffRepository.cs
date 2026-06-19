using LearnCSharp.Application.DTOs.Telegram;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Application.Interfaces;

public interface ITelegramStaffRepository
{
    Task<TelegramAccountDto?> FindAccountByTelegramUserIdAsync(
        long telegramUserId,
        CancellationToken cancellationToken = default);

    Task<TelegramAccountDto?> FindAccountByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TelegramAccountDto>> GetStaffAccountsAsync(
        CancellationToken cancellationToken = default);

    Task LinkAccountAsync(
        Guid userId,
        long telegramUserId,
        long chatId,
        string verifiedPhone,
        CancellationToken cancellationToken = default);

    Task TouchLastSeenAsync(long telegramUserId, CancellationToken cancellationToken = default);

    Task<EmployeeProfileDto?> GetEmployeeProfileAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task EnsureEmployeeProfileAsync(Guid userId, CancellationToken cancellationToken = default);

    Task UpdateEmployeeProfileAsync(
        Guid userId,
        decimal sharePercent,
        bool canAcceptOrders,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<EmployeeListItemDto>> GetEmployeesAsync(
        CancellationToken cancellationToken = default);

    Task<OrderAssignmentDto?> GetOrderAssignmentAsync(
        Guid orderId,
        CancellationToken cancellationToken = default);

    Task<bool> TryClaimOrderAsync(
        Guid orderId,
        Guid employeeUserId,
        CancellationToken cancellationToken = default);

    Task AddAuditLogAsync(
        Guid actorUserId,
        StaffAuditAction action,
        string details,
        Guid? orderId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StaffAuditLogDto>> GetRecentAuditLogsAsync(
        int limit,
        CancellationToken cancellationToken = default);

    Task EnqueueOutboxAsync(
        TelegramOutboxType type,
        string payloadJson,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TelegramOutboxDto>> DequeueOutboxBatchAsync(
        int batchSize,
        CancellationToken cancellationToken = default);

    Task MarkOutboxProcessedAsync(Guid id, CancellationToken cancellationToken = default);

    Task SaveOrderNotificationAsync(
        Guid orderId,
        long chatId,
        int messageId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TelegramOrderNotificationDto>> GetOpenNotificationsForOrderAsync(
        Guid orderId,
        CancellationToken cancellationToken = default);

    Task CloseOrderNotificationsAsync(Guid orderId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Order>> GetUnclaimedPendingOrdersAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Order>> GetOrdersAssignedToAsync(
        Guid employeeUserId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Order>> GetCompletedOrdersForEmployeeAsync(
        Guid employeeUserId,
        DateTime? fromUtc,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Order>> GetActiveOrdersForAdminAsync(
        CancellationToken cancellationToken = default);

    Task<Order?> FindOrderByIdAsync(Guid orderId, CancellationToken cancellationToken = default);

    Task UpdateOrderAsync(Order order, CancellationToken cancellationToken = default);
}
