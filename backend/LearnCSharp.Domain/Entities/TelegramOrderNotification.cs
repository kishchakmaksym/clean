namespace LearnCSharp.Domain.Entities;

public class TelegramOrderNotification
{
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }

    public Order Order { get; set; } = null!;

    public long ChatId { get; set; }

    public int MessageId { get; set; }

    public DateTime SentAtUtc { get; set; }

    public bool IsClosed { get; set; }
}
