namespace LearnCSharp.Domain.Entities;

public class UserAddress
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    public string? Label { get; set; }

    public required string AddressLine { get; set; }

    public bool IsDefault { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
