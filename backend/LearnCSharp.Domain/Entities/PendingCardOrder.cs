namespace LearnCSharp.Domain.Entities;

public class PendingCardOrder
{
    public required string InvoiceId { get; set; }

    public Guid UserId { get; set; }

    public required string OrderPayloadJson { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
