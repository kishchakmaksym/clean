using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Domain.Entities;

public class Order
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    public OrderStatus Status { get; set; }

    public required string ServiceId { get; set; }

    public required string ServiceTitle { get; set; }

    public required string OrderType { get; set; }

    public int? AreaSqm { get; set; }

    public int? Rooms { get; set; }

    public int? Bathrooms { get; set; }

    public string? SelectedAddonsJson { get; set; }

    public required string TimeSlot { get; set; }

    public required string TimeSlotLabel { get; set; }

    public string? Notes { get; set; }

    public required string PaymentMethod { get; set; }

    public int TotalAmount { get; set; }

    public int PayableAmount { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}
