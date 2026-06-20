namespace LearnCSharp.Domain.Entities;

public class HiringOutboxMessage
{
    public Guid Id { get; set; }

    public Guid ApplicationId { get; set; }

    public JobApplication? Application { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? ProcessedAtUtc { get; set; }
}
