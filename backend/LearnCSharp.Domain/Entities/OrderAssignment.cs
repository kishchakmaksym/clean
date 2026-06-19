namespace LearnCSharp.Domain.Entities;

public class OrderAssignment
{
    public Guid OrderId { get; set; }

    public Order Order { get; set; } = null!;

    public Guid EmployeeUserId { get; set; }

    public User Employee { get; set; } = null!;

    public DateTime ClaimedAtUtc { get; set; }
}
