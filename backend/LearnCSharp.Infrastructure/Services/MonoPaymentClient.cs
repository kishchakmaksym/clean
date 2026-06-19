using System.Text.Json;
using System.Text.Json.Serialization;
using LearnCSharp.Infrastructure.Options;
using LearnCSharp.Application.Interfaces;
using Microsoft.Extensions.Options;

namespace LearnCSharp.Infrastructure.Services;

public sealed class MonoPaymentClient(
    IHttpClientFactory httpClientFactory,
    IOptions<MonobankOptions> monobankOptions) : IMonoPaymentClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private static readonly HashSet<string> FinalStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "failure",
        "expired",
        "reversed",
    };

    public async Task<MonoInvoiceStatusResult> GetInvoiceStatusAsync(
        string invoiceId,
        CancellationToken cancellationToken = default)
    {
        var options = monobankOptions.Value;

        if (string.IsNullOrWhiteSpace(options.Token))
        {
            return new MonoInvoiceStatusResult
            {
                Success = false,
                Error = "Monobank token не налаштований.",
            };
        }

        using var client = httpClientFactory.CreateClient("Monobank");
        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Get,
            $"api/merchant/invoice/status?invoiceId={Uri.EscapeDataString(invoiceId.Trim())}");

        httpRequest.Headers.Add("X-Token", options.Token);

        using var response = await client.SendAsync(httpRequest, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return new MonoInvoiceStatusResult
            {
                Success = false,
                Error = $"Monobank повернув помилку ({(int)response.StatusCode}): {body}",
            };
        }

        var invoiceStatus = JsonSerializer.Deserialize<MonoInvoiceStatusApiResponse>(body, JsonOptions);

        if (invoiceStatus is null || string.IsNullOrWhiteSpace(invoiceStatus.Status))
        {
            return new MonoInvoiceStatusResult
            {
                Success = false,
                Error = "Не вдалося отримати статус оплати від Monobank.",
            };
        }

        var normalizedStatus = invoiceStatus.Status.Trim().ToLowerInvariant();

        return new MonoInvoiceStatusResult
        {
            Success = true,
            Status = normalizedStatus,
            IsPaid = normalizedStatus == "success",
            FailureReason = invoiceStatus.FailureReason,
        };
    }

    public async Task<MonoInvoiceStatusResult> WaitForSuccessfulPaymentAsync(
        string invoiceId,
        CancellationToken cancellationToken = default)
    {
        const int maxAttempts = 20;

        for (var attempt = 0; attempt < maxAttempts; attempt++)
        {
            var status = await GetInvoiceStatusAsync(invoiceId, cancellationToken);

            if (!status.Success)
            {
                return status;
            }

            if (status.IsPaid)
            {
                return status;
            }

            if (status.Status is not null && FinalStatuses.Contains(status.Status))
            {
                return status;
            }

            if (attempt < maxAttempts - 1)
            {
                await Task.Delay(TimeSpan.FromMilliseconds(1500), cancellationToken);
            }
        }

        return new MonoInvoiceStatusResult
        {
            Success = false,
            Error = "Оплата ще обробляється. Оновіть сторінку через хвилину.",
        };
    }

    private sealed class MonoInvoiceStatusApiResponse
    {
        public string? Status { get; set; }

        public string? FailureReason { get; set; }
    }
}
