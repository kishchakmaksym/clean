using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Domain.Entities;

public class StaffAuditLog
{
    public Guid Id { get; set; }

    public Guid? OrderId { get; set; }

    public Order? Order { get; set; }

    public Guid ActorUserId { get; set; }

    public User Actor { get; set; } = null!;

    public StaffAuditAction Action { get; set; }

    public required string Details { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
