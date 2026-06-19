using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Domain.Entities;

public class TelegramOutboxMessage
{
    public Guid Id { get; set; }

    public TelegramOutboxType Type { get; set; }

    public required string PayloadJson { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? ProcessedAtUtc { get; set; }
}
