namespace LearnCSharp.Domain.Entities;

public class Review
{
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }

    public User? User { get; set; }

    public required string AuthorName { get; set; }

    public int Rating { get; set; }

    public required string Text { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
