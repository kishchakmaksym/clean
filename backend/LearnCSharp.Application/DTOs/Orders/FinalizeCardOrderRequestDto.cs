namespace LearnCSharp.Application.DTOs.Orders;

public sealed class FinalizeCardOrderRequestDto
{
    public required Guid UserId { get; init; }

    public required string InvoiceId { get; init; }
}
