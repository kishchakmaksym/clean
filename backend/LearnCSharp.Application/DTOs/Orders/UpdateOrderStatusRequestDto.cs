namespace LearnCSharp.Application.DTOs.Orders;

public sealed class UpdateOrderStatusRequestDto
{
    public required Guid UserId { get; init; }

    public required Guid OrderId { get; init; }

    public required string Status { get; init; }
}
