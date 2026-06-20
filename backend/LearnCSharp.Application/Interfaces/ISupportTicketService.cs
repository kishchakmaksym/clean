using LearnCSharp.Application.DTOs.Support;

namespace LearnCSharp.Application.Interfaces;

public interface ISupportTicketService
{
    Task<SupportTicketsResponseDto> GetTicketsForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<SupportMessagesResponseDto?> GetTicketThreadAsync(
        Guid userId,
        Guid ticketId,
        DateTime? sinceUtc,
        CancellationToken cancellationToken = default);

    Task<SupportActionResponseDto> CreateTicketAsync(
        CreateSupportTicketRequestDto request,
        CancellationToken cancellationToken = default);

    Task<SupportActionResponseDto> SendUserMessageAsync(
        SendSupportMessageRequestDto request,
        CancellationToken cancellationToken = default);

    Task<SupportTicketsResponseDto> GetTicketsForAdminAsync(
        Guid adminUserId,
        CancellationToken cancellationToken = default);

    Task<SupportMessagesResponseDto?> GetTicketThreadForAdminAsync(
        Guid adminUserId,
        Guid ticketId,
        DateTime? sinceUtc,
        CancellationToken cancellationToken = default);

    Task<SupportActionResponseDto> SendStaffMessageAsync(
        AdminSupportMessageRequestDto request,
        CancellationToken cancellationToken = default);

    Task<SupportActionResponseDto> CloseTicketAsync(
        Guid adminUserId,
        Guid ticketId,
        CancellationToken cancellationToken = default);

    Task<SupportActionResponseDto> SendStaffMessageFromTelegramAsync(
        Guid adminUserId,
        Guid ticketId,
        string body,
        CancellationToken cancellationToken = default);

    Task<SupportTelegramLinkResultDto> LinkTelegramAdminAsync(
        long telegramUserId,
        long chatId,
        string contactPhone,
        CancellationToken cancellationToken = default);

    Task SetUserTypingAsync(
        Guid userId,
        Guid ticketId,
        CancellationToken cancellationToken = default);

    Task SetStaffTypingAsync(
        Guid adminUserId,
        Guid ticketId,
        CancellationToken cancellationToken = default);
}
