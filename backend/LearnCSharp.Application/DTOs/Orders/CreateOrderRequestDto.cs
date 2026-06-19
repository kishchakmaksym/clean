namespace LearnCSharp.Application.DTOs.Orders;

public sealed class CreateOrderRequestDto
{
    public required Guid UserId { get; init; }

    public required string ServiceId { get; init; }

    public required string ServiceTitle { get; init; }

    public required string OrderType { get; init; }

    public int? AreaSqm { get; init; }

    public int? Rooms { get; init; }

    public int? Bathrooms { get; init; }

    public IReadOnlyList<string>? SelectedAddons { get; init; }

    public required string TimeSlot { get; init; }

    public required string TimeSlotLabel { get; init; }

    public string? Notes { get; init; }

    public required string PaymentMethod { get; init; }

    public required int TotalAmount { get; init; }

    public required int PayableAmount { get; init; }
}
