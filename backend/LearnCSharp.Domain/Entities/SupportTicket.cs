using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Domain.Entities;

public class SupportTicket
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    public SupportTicketStatus Status { get; set; }

    public string? Subject { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }

    public DateTime? ClosedAtUtc { get; set; }

    public DateTime? UserTypingUntilUtc { get; set; }

    public DateTime? StaffTypingUntilUtc { get; set; }

    public ICollection<SupportMessage> Messages { get; set; } = [];
}
