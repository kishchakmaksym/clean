namespace LearnCSharp.Domain.Entities;

public class TelegramAccount
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    public long TelegramUserId { get; set; }

    public long ChatId { get; set; }

    public required string VerifiedPhone { get; set; }

    public DateTime LinkedAtUtc { get; set; }

    public DateTime? LastSeenAtUtc { get; set; }
}
