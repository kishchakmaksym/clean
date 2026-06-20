namespace LearnCSharp.Application.DTOs.Orders;

public sealed class CancelOrderRequestDto
{
    public required Guid UserId { get; init; }

    public required Guid OrderId { get; init; }
}
