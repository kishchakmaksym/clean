using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Domain.Entities;

public class SupportMessage
{
    public Guid Id { get; set; }

    public Guid TicketId { get; set; }

    public SupportTicket Ticket { get; set; } = null!;

    public SupportMessageSenderType SenderType { get; set; }

    public Guid? SenderUserId { get; set; }

    public User? SenderUser { get; set; }

    public required string Body { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
