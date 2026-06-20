using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Domain.Entities;

public class SupportOutboxMessage
{
    public Guid Id { get; set; }

    public SupportOutboxType Type { get; set; }

    public required string PayloadJson { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? ProcessedAtUtc { get; set; }
}
