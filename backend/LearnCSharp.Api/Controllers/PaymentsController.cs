using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using LearnCSharp.Application.DTOs.Orders;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Infrastructure.Options;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace LearnCSharp.Api.Controllers;

[ApiController]
[Route("api/payments")]
public sealed class PaymentsController(
    IHttpClientFactory httpClientFactory,
    IOptions<MonobankOptions> monobankOptions,
    IPendingCardOrderRepository pendingCardOrderRepository) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    [HttpPost("mono/invoice")]
    [ProducesResponseType(typeof(CreateMonoInvoiceResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(CreateMonoInvoiceResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreateMonoInvoiceResponseDto>> CreateMonoInvoice(
        [FromBody] CreateMonoInvoiceRequestDto request,
        CancellationToken cancellationToken)
    {
        var options = monobankOptions.Value;

        if (string.IsNullOrWhiteSpace(options.Token))
        {
            return BadRequest(new CreateMonoInvoiceResponseDto
            {
                Success = false,
                Error = "Monobank token не налаштований. Додайте Monobank:Token у appsettings.Development.json",
            });
        }

        if (request.Amount < 100)
        {
            return BadRequest(new CreateMonoInvoiceResponseDto
            {
                Success = false,
                Error = "Мінімальна сума оплати — 1 ₴.",
            });
        }

        var reference = string.IsNullOrWhiteSpace(request.Reference)
            ? Guid.NewGuid().ToString("N")
            : request.Reference.Trim();

        var payload = new
        {
            amount = request.Amount,
            ccy = 980,
            merchantPaymInfo = new
            {
                reference,
                destination = request.Destination.Trim(),
                comment = request.Destination.Trim(),
            },
            redirectUrl = options.RedirectUrl,
            webHookUrl = options.WebhookUrl,
            validity = 3600,
            paymentType = "debit",
        };

        using var client = httpClientFactory.CreateClient("Monobank");
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "api/merchant/invoice/create")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json"),
        };

        httpRequest.Headers.Add("X-Token", options.Token);

        using var response = await client.SendAsync(httpRequest, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return BadRequest(new CreateMonoInvoiceResponseDto
            {
                Success = false,
                Error = $"Monobank повернув помилку ({(int)response.StatusCode}): {body}",
            });
        }

        var invoice = JsonSerializer.Deserialize<MonoInvoiceApiResponse>(body, JsonOptions);

        if (invoice is null || string.IsNullOrWhiteSpace(invoice.PageUrl))
        {
            return BadRequest(new CreateMonoInvoiceResponseDto
            {
                Success = false,
                Error = "Не вдалося отримати посилання на оплату від Monobank.",
            });
        }

        if (request.PendingOrder is not null && !string.IsNullOrWhiteSpace(invoice.InvoiceId))
        {
            await pendingCardOrderRepository.SaveAsync(new PendingCardOrder
            {
                InvoiceId = invoice.InvoiceId.Trim(),
                UserId = request.PendingOrder.UserId,
                OrderPayloadJson = JsonSerializer.Serialize(request.PendingOrder, JsonOptions),
                CreatedAtUtc = DateTime.UtcNow,
            }, cancellationToken);
        }

        return Ok(new CreateMonoInvoiceResponseDto
        {
            Success = true,
            InvoiceId = invoice.InvoiceId,
            PageUrl = invoice.PageUrl,
            Reference = reference,
        });
    }

    [HttpGet("mono/invoice/{invoiceId}/status")]
    [ProducesResponseType(typeof(MonoInvoiceStatusResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MonoInvoiceStatusResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MonoInvoiceStatusResponseDto>> GetMonoInvoiceStatus(
        string invoiceId,
        CancellationToken cancellationToken)
    {
        var options = monobankOptions.Value;

        if (string.IsNullOrWhiteSpace(options.Token))
        {
            return BadRequest(new MonoInvoiceStatusResponseDto
            {
                Success = false,
                Error = "Monobank token не налаштований.",
            });
        }

        if (string.IsNullOrWhiteSpace(invoiceId))
        {
            return BadRequest(new MonoInvoiceStatusResponseDto
            {
                Success = false,
                Error = "Ідентифікатор рахунку не вказано.",
            });
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
            return BadRequest(new MonoInvoiceStatusResponseDto
            {
                Success = false,
                Error = $"Monobank повернув помилку ({(int)response.StatusCode}): {body}",
            });
        }

        var invoiceStatus = JsonSerializer.Deserialize<MonoInvoiceStatusApiResponse>(body, JsonOptions);

        if (invoiceStatus is null || string.IsNullOrWhiteSpace(invoiceStatus.Status))
        {
            return BadRequest(new MonoInvoiceStatusResponseDto
            {
                Success = false,
                Error = "Не вдалося отримати статус оплати від Monobank.",
            });
        }

        var normalizedStatus = invoiceStatus.Status.Trim().ToLowerInvariant();

        return Ok(new MonoInvoiceStatusResponseDto
        {
            Success = true,
            Status = normalizedStatus,
            IsPaid = normalizedStatus == "success",
            FailureReason = invoiceStatus.FailureReason,
        });
    }

    private sealed class MonoInvoiceApiResponse
    {
        public string? InvoiceId { get; set; }

        public string? PageUrl { get; set; }
    }

    private sealed class MonoInvoiceStatusApiResponse
    {
        public string? Status { get; set; }

        public string? FailureReason { get; set; }
    }
}

public sealed class CreateMonoInvoiceRequestDto
{
    public required int Amount { get; init; }

    public required string Destination { get; init; }

    public string? Reference { get; init; }

    public CreateOrderRequestDto? PendingOrder { get; init; }
}

public sealed class CreateMonoInvoiceResponseDto
{
    public bool Success { get; init; }

    public string? InvoiceId { get; init; }

    public string? PageUrl { get; init; }

    public string? Reference { get; init; }

    public string? Error { get; init; }
}

public sealed class MonoInvoiceStatusResponseDto
{
    public bool Success { get; init; }

    public string? Status { get; init; }

    public bool IsPaid { get; init; }

    public string? FailureReason { get; init; }

    public string? Error { get; init; }
}
