namespace LearnCSharp.Application.Interfaces;

public interface IMonoPaymentClient
{
    Task<MonoInvoiceStatusResult> GetInvoiceStatusAsync(string invoiceId, CancellationToken cancellationToken = default);

    Task<MonoInvoiceStatusResult> WaitForSuccessfulPaymentAsync(
        string invoiceId,
        CancellationToken cancellationToken = default);
}

public sealed class MonoInvoiceStatusResult
{
    public bool Success { get; init; }

    public bool IsPaid { get; init; }

    public string? Status { get; init; }

    public string? FailureReason { get; init; }

    public string? Error { get; init; }
}
