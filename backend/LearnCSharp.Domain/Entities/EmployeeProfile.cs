namespace LearnCSharp.Domain.Entities;

public class EmployeeProfile
{
    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    /// <summary>Частка працівника від суми замовлення (0–100%).</summary>
    public decimal SharePercent { get; set; }

    public bool CanAcceptOrders { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}
