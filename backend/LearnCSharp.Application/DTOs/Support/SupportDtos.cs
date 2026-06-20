namespace LearnCSharp.Application.DTOs.Support;

public sealed class SupportTicketDto
{
    public required Guid Id { get; init; }

    public required Guid UserId { get; init; }

    public required string UserDisplayId { get; init; }

    public required string CustomerName { get; init; }

    public required string CustomerPhone { get; init; }

    public required string Status { get; init; }

    public string? Subject { get; init; }

    public required string Preview { get; init; }

    public required DateTime CreatedAtUtc { get; init; }

    public DateTime? UpdatedAtUtc { get; init; }

    public int UnreadForUser { get; init; }

    public int UnreadForStaff { get; init; }
}

public sealed class SupportMessageDto
{
    public required Guid Id { get; init; }

    public required Guid TicketId { get; init; }

    public required string SenderType { get; init; }

    public string? SenderName { get; init; }

    public required string Body { get; init; }

    public required DateTime CreatedAtUtc { get; init; }
}

public sealed class SupportTicketsResponseDto
{
    public required IReadOnlyList<SupportTicketDto> Tickets { get; init; }

    public required string UserDisplayId { get; init; }
}

public sealed class SupportMessagesResponseDto
{
    public required SupportTicketDto Ticket { get; init; }

    public required IReadOnlyList<SupportMessageDto> Messages { get; init; }

    public bool OtherPartyTyping { get; init; }
}

public sealed class CreateSupportTicketRequestDto
{
    public required Guid UserId { get; init; }

    public required string Body { get; init; }

    public bool FaqChecked { get; init; }
}

public sealed class SendSupportMessageRequestDto
{
    public required Guid UserId { get; init; }

    public required Guid TicketId { get; init; }

    public required string Body { get; init; }
}

public sealed class AdminSupportMessageRequestDto
{
    public required Guid UserId { get; init; }

    public required Guid TicketId { get; init; }

    public required string Body { get; init; }
}

public sealed class SupportActionResponseDto
{
    public bool Success { get; init; }

    public string? Message { get; init; }

    public SupportTicketDto? Ticket { get; init; }

    public SupportMessageDto? SentMessage { get; init; }

    public IReadOnlyList<string> Errors { get; init; } = [];
}

public sealed class SupportTelegramLinkResultDto
{
    public bool Success { get; init; }

    public required string Message { get; init; }

    public Guid? AdminUserId { get; init; }
}
