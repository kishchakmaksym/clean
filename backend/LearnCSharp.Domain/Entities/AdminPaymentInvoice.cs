namespace LearnCSharp.Domain.Entities;

public class AdminPaymentInvoice
{
    public required string InvoiceId { get; set; }

    public Guid CreatedByUserId { get; set; }

    public required string Label { get; set; }

    public required string Destination { get; set; }

    public int AmountKopiyky { get; set; }

    public required string PageUrl { get; set; }

    public required string Reference { get; set; }

    public required string Status { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime ExpiresAtUtc { get; set; }

    public DateTime? PaidAtUtc { get; set; }

    public DateTime? DeletedAtUtc { get; set; }
}
