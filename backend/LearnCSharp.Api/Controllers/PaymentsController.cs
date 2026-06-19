using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using LearnCSharp.Api.Options;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace LearnCSharp.Api.Controllers;

[ApiController]
[Route("api/payments")]
public sealed class PaymentsController(
    IHttpClientFactory httpClientFactory,
    IOptions<MonobankOptions> monobankOptions) : ControllerBase
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

        return Ok(new CreateMonoInvoiceResponseDto
        {
            Success = true,
            InvoiceId = invoice.InvoiceId,
            PageUrl = invoice.PageUrl,
            Reference = reference,
        });
    }

    private sealed class MonoInvoiceApiResponse
    {
        public string? InvoiceId { get; set; }

        public string? PageUrl { get; set; }
    }
}

public sealed class CreateMonoInvoiceRequestDto
{
    public required int Amount { get; init; }

    public required string Destination { get; init; }

    public string? Reference { get; init; }
}

public sealed class CreateMonoInvoiceResponseDto
{
    public bool Success { get; init; }

    public string? InvoiceId { get; init; }

    public string? PageUrl { get; init; }

    public string? Reference { get; init; }

    public string? Error { get; init; }
}
