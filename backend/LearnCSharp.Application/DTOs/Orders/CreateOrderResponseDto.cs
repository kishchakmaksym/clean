namespace LearnCSharp.Application.DTOs.Orders;

public sealed class CreateOrderResponseDto
{
    public bool Success { get; init; }

    public string? Message { get; init; }

    public OrderResponseDto? Order { get; init; }

    public IReadOnlyList<string> Errors { get; init; } = [];
}
