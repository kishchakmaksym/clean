using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using LearnCSharp.Application.DTOs.Orders;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Domain.Enums;
using LearnCSharp.Infrastructure.Options;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace LearnCSharp.Api.Controllers;

[ApiController]
[Route("api/payments")]
public sealed class PaymentsController(
    IHttpClientFactory httpClientFactory,
    IOptions<MonobankOptions> monobankOptions,
    IPendingCardOrderRepository pendingCardOrderRepository,
    IAdminPaymentInvoiceRepository adminPaymentInvoiceRepository,
    IMonoPaymentClient monoPaymentClient,
    IUserRepository userRepository) : ControllerBase
{
    private const int AdminInvoiceValiditySeconds = 30 * 24 * 60 * 60;
    private const int MaxAdminInvoicesPerBatch = 20;
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
        if (request.Amount < 100)
        {
            return BadRequest(new CreateMonoInvoiceResponseDto
            {
                Success = false,
                Error = "Мінімальна сума оплати — 1 ₴.",
            });
        }

        var result = await CreateMonoInvoiceCoreAsync(
            request.Amount,
            request.Destination.Trim(),
            request.Reference,
            validitySeconds: 3600,
            cancellationToken);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        if (request.PendingOrder is not null && !string.IsNullOrWhiteSpace(result.InvoiceId))
        {
            await pendingCardOrderRepository.SaveAsync(new PendingCardOrder
            {
                InvoiceId = result.InvoiceId.Trim(),
                UserId = request.PendingOrder.UserId,
                OrderPayloadJson = JsonSerializer.Serialize(request.PendingOrder, JsonOptions),
                CreatedAtUtc = DateTime.UtcNow,
            }, cancellationToken);
        }

        return Ok(result);
    }

    [HttpPost("mono/invoice/admin/batch")]
    [ProducesResponseType(typeof(CreateAdminMonoInvoiceBatchResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(CreateAdminMonoInvoiceBatchResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreateAdminMonoInvoiceBatchResponseDto>> CreateAdminMonoInvoiceBatch(
        [FromBody] CreateAdminMonoInvoiceBatchRequestDto request,
        CancellationToken cancellationToken)
    {
        var adminError = await ValidateAdminAsync(request.UserId, cancellationToken);
        if (adminError is not null)
        {
            return BadRequest(new CreateAdminMonoInvoiceBatchResponseDto
            {
                Success = false,
                Error = adminError,
            });
        }

        if (request.Amount < 100)
        {
            return BadRequest(new CreateAdminMonoInvoiceBatchResponseDto
            {
                Success = false,
                Error = "Мінімальна сума оплати — 1 ₴.",
            });
        }

        var labels = ResolveBatchLabels(request);
        if (labels.Count > MaxAdminInvoicesPerBatch)
        {
            return BadRequest(new CreateAdminMonoInvoiceBatchResponseDto
            {
                Success = false,
                Error = $"За один раз можна створити не більше {MaxAdminInvoicesPerBatch} рахунків.",
            });
        }

        var baseDestination = string.IsNullOrWhiteSpace(request.Destination)
            ? "Оплата послуг Smart Clean"
            : request.Destination.Trim();

        var createdAtUtc = DateTime.UtcNow;
        var expiresAtUtc = createdAtUtc.AddSeconds(AdminInvoiceValiditySeconds);
        var invoices = new List<AdminPaymentInvoiceDto>(labels.Count);

        foreach (var label in labels)
        {
            var destination = labels.Count > 1
                ? $"{label} — {baseDestination}"
                : baseDestination;

            var result = await CreateMonoInvoiceCoreAsync(
                request.Amount,
                destination,
                reference: null,
                validitySeconds: AdminInvoiceValiditySeconds,
                cancellationToken);

            if (!result.Success || string.IsNullOrWhiteSpace(result.InvoiceId) || string.IsNullOrWhiteSpace(result.PageUrl))
            {
                return BadRequest(new CreateAdminMonoInvoiceBatchResponseDto
                {
                    Success = false,
                    Error = result.Error ?? "Не вдалося створити рахунок Monobank.",
                    Invoices = invoices,
                });
            }

            var invoice = new AdminPaymentInvoice
            {
                InvoiceId = result.InvoiceId.Trim(),
                CreatedByUserId = request.UserId,
                Label = label,
                Destination = destination,
                AmountKopiyky = request.Amount,
                PageUrl = result.PageUrl.Trim(),
                Reference = result.Reference ?? Guid.NewGuid().ToString("N"),
                Status = "created",
                CreatedAtUtc = createdAtUtc,
                ExpiresAtUtc = expiresAtUtc,
            };

            try
            {
                await adminPaymentInvoiceRepository.AddAsync(invoice, cancellationToken);
            }
            catch (Exception)
            {
                return BadRequest(new CreateAdminMonoInvoiceBatchResponseDto
                {
                    Success = false,
                    Error = "Не вдалося зберегти рахунок у базі. Перезапустіть backend.",
                    Invoices = invoices,
                });
            }

            invoices.Add(MapAdminInvoice(invoice));
        }

        return Ok(new CreateAdminMonoInvoiceBatchResponseDto
        {
            Success = true,
            Invoices = invoices,
        });
    }

    [HttpGet("mono/invoice/admin")]
    [ProducesResponseType(typeof(AdminPaymentInvoiceListResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AdminPaymentInvoiceListResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AdminPaymentInvoiceListResponseDto>> GetAdminMonoInvoices(
        [FromQuery] Guid userId,
        [FromQuery] bool refresh = true,
        CancellationToken cancellationToken = default)
    {
        var adminError = await ValidateAdminAsync(userId, cancellationToken);
        if (adminError is not null)
        {
            return BadRequest(new AdminPaymentInvoiceListResponseDto
            {
                Success = false,
                Error = adminError,
            });
        }

        if (refresh)
        {
            await RefreshPendingAdminInvoicesAsync(userId, cancellationToken);
        }

        var invoices = await adminPaymentInvoiceRepository.GetForAdminAsync(userId, cancellationToken: cancellationToken);

        return Ok(new AdminPaymentInvoiceListResponseDto
        {
            Success = true,
            Invoices = invoices.Select(MapAdminInvoice).ToList(),
        });
    }

    [HttpPost("mono/invoice/admin/refresh")]
    [ProducesResponseType(typeof(AdminPaymentInvoiceListResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AdminPaymentInvoiceListResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AdminPaymentInvoiceListResponseDto>> RefreshAdminMonoInvoices(
        [FromBody] RefreshAdminMonoInvoicesRequestDto request,
        CancellationToken cancellationToken)
    {
        var adminError = await ValidateAdminAsync(request.UserId, cancellationToken);
        if (adminError is not null)
        {
            return BadRequest(new AdminPaymentInvoiceListResponseDto
            {
                Success = false,
                Error = adminError,
            });
        }

        await RefreshPendingAdminInvoicesAsync(request.UserId, cancellationToken);

        var invoices = await adminPaymentInvoiceRepository.GetForAdminAsync(
            request.UserId,
            cancellationToken: cancellationToken);

        return Ok(new AdminPaymentInvoiceListResponseDto
        {
            Success = true,
            Invoices = invoices.Select(MapAdminInvoice).ToList(),
        });
    }

    [HttpPost("mono/invoice/admin/delete")]
    [ProducesResponseType(typeof(DeleteAdminMonoInvoiceResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(DeleteAdminMonoInvoiceResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DeleteAdminMonoInvoiceResponseDto>> DeleteAdminMonoInvoice(
        [FromBody] DeleteAdminMonoInvoiceRequestDto request,
        CancellationToken cancellationToken)
    {
        var adminError = await ValidateAdminAsync(request.UserId, cancellationToken);
        if (adminError is not null)
        {
            return BadRequest(new DeleteAdminMonoInvoiceResponseDto
            {
                Success = false,
                Error = adminError,
            });
        }

        if (string.IsNullOrWhiteSpace(request.InvoiceId))
        {
            return BadRequest(new DeleteAdminMonoInvoiceResponseDto
            {
                Success = false,
                Error = "Не вказано рахунок.",
            });
        }

        var deleted = await adminPaymentInvoiceRepository.MarkAsDeletedAsync(
            request.InvoiceId.Trim(),
            request.UserId,
            cancellationToken);

        if (!deleted)
        {
            return BadRequest(new DeleteAdminMonoInvoiceResponseDto
            {
                Success = false,
                Error = "Рахунок не знайдено або вже оплачено.",
            });
        }

        var invoices = await adminPaymentInvoiceRepository.GetForAdminAsync(
            request.UserId,
            cancellationToken: cancellationToken);

        return Ok(new DeleteAdminMonoInvoiceResponseDto
        {
            Success = true,
            Invoices = invoices.Select(MapAdminInvoice).ToList(),
        });
    }

    [HttpPost("mono/invoice/admin/restore")]
    [ProducesResponseType(typeof(DeleteAdminMonoInvoiceResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(DeleteAdminMonoInvoiceResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DeleteAdminMonoInvoiceResponseDto>> RestoreAdminMonoInvoice(
        [FromBody] DeleteAdminMonoInvoiceRequestDto request,
        CancellationToken cancellationToken)
    {
        var adminError = await ValidateAdminAsync(request.UserId, cancellationToken);
        if (adminError is not null)
        {
            return BadRequest(new DeleteAdminMonoInvoiceResponseDto
            {
                Success = false,
                Error = adminError,
            });
        }

        if (string.IsNullOrWhiteSpace(request.InvoiceId))
        {
            return BadRequest(new DeleteAdminMonoInvoiceResponseDto
            {
                Success = false,
                Error = "Не вказано рахунок.",
            });
        }

        var restored = await adminPaymentInvoiceRepository.RestoreAsync(
            request.InvoiceId.Trim(),
            request.UserId,
            cancellationToken);

        if (!restored)
        {
            return BadRequest(new DeleteAdminMonoInvoiceResponseDto
            {
                Success = false,
                Error = "Рахунок не знайдено або не видалений.",
            });
        }

        var invoices = await adminPaymentInvoiceRepository.GetForAdminAsync(
            request.UserId,
            cancellationToken: cancellationToken);

        return Ok(new DeleteAdminMonoInvoiceResponseDto
        {
            Success = true,
            Invoices = invoices.Select(MapAdminInvoice).ToList(),
        });
    }

    private async Task<string?> ValidateAdminAsync(Guid userId, CancellationToken cancellationToken)
    {
        var admin = await userRepository.FindByIdAsync(userId, cancellationToken);

        if (admin is null)
        {
            return "Користувача не знайдено. Увійдіть знову.";
        }

        if (admin.Role != UserRole.Admin)
        {
            return "Лише адміністратор може створювати рахунки.";
        }

        return null;
    }

    private static IReadOnlyList<string> ResolveBatchLabels(CreateAdminMonoInvoiceBatchRequestDto request)
    {
        var labels = request.Labels?
            .Select(label => label.Trim())
            .Where(label => !string.IsNullOrWhiteSpace(label))
            .Take(MaxAdminInvoicesPerBatch)
            .ToList();

        if (labels is { Count: > 0 })
        {
            return labels;
        }

        var count = request.Count ?? 1;
        if (count < 1)
        {
            count = 1;
        }

        if (count > MaxAdminInvoicesPerBatch)
        {
            count = MaxAdminInvoicesPerBatch;
        }

        return Enumerable.Range(1, count)
            .Select(index => $"#{index}")
            .ToList();
    }

    private async Task RefreshPendingAdminInvoicesAsync(Guid adminUserId, CancellationToken cancellationToken)
    {
        var pending = await adminPaymentInvoiceRepository.GetPendingStatusRefreshAsync(
            adminUserId,
            cancellationToken);

        foreach (var invoice in pending)
        {
            var status = await monoPaymentClient.GetInvoiceStatusAsync(invoice.InvoiceId, cancellationToken);
            if (!status.Success || string.IsNullOrWhiteSpace(status.Status))
            {
                continue;
            }

            var normalizedStatus = status.Status.Trim().ToLowerInvariant();
            DateTime? paidAtUtc = normalizedStatus == "success" ? DateTime.UtcNow : null;

            await adminPaymentInvoiceRepository.UpdateStatusAsync(
                invoice.InvoiceId,
                normalizedStatus,
                paidAtUtc,
                cancellationToken);
        }
    }

    private static AdminPaymentInvoiceDto MapAdminInvoice(AdminPaymentInvoice invoice) =>
        new()
        {
            InvoiceId = invoice.InvoiceId,
            Label = invoice.Label,
            Destination = invoice.Destination,
            AmountKopiyky = invoice.AmountKopiyky,
            PageUrl = invoice.PageUrl,
            Reference = invoice.Reference,
            Status = invoice.Status,
            IsPaid = string.Equals(invoice.Status, "success", StringComparison.OrdinalIgnoreCase),
            IsDeleted = invoice.DeletedAtUtc is not null,
            CreatedAtUtc = invoice.CreatedAtUtc,
            ExpiresAtUtc = invoice.ExpiresAtUtc,
            PaidAtUtc = invoice.PaidAtUtc,
            DeletedAtUtc = invoice.DeletedAtUtc,
        };

    private async Task<CreateMonoInvoiceResponseDto> CreateMonoInvoiceCoreAsync(
        int amountKopiyky,
        string destination,
        string? reference,
        int validitySeconds,
        CancellationToken cancellationToken)
    {
        var options = monobankOptions.Value;

        if (string.IsNullOrWhiteSpace(options.Token))
        {
            return new CreateMonoInvoiceResponseDto
            {
                Success = false,
                Error = "Monobank token не налаштований. Додайте Monobank:Token у appsettings.Development.json",
            };
        }

        var paymentReference = string.IsNullOrWhiteSpace(reference)
            ? Guid.NewGuid().ToString("N")
            : reference.Trim();

        var payload = new
        {
            amount = amountKopiyky,
            ccy = 980,
            merchantPaymInfo = new
            {
                reference = paymentReference,
                destination,
                comment = destination,
            },
            redirectUrl = options.RedirectUrl,
            webHookUrl = options.WebhookUrl,
            validity = validitySeconds,
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
            return new CreateMonoInvoiceResponseDto
            {
                Success = false,
                Error = $"Monobank повернув помилку ({(int)response.StatusCode}): {body}",
            };
        }

        var invoice = JsonSerializer.Deserialize<MonoInvoiceApiResponse>(body, JsonOptions);

        if (invoice is null || string.IsNullOrWhiteSpace(invoice.PageUrl))
        {
            return new CreateMonoInvoiceResponseDto
            {
                Success = false,
                Error = "Не вдалося отримати посилання на оплату від Monobank.",
            };
        }

        return new CreateMonoInvoiceResponseDto
        {
            Success = true,
            InvoiceId = invoice.InvoiceId,
            PageUrl = invoice.PageUrl,
            Reference = paymentReference,
        };
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

public sealed class CreateAdminMonoInvoiceBatchRequestDto
{
    public required Guid UserId { get; init; }

    public required int Amount { get; init; }

    public string? Destination { get; init; }

    public IReadOnlyList<string>? Labels { get; init; }

    public int? Count { get; init; }
}

public sealed class CreateAdminMonoInvoiceBatchResponseDto
{
    public bool Success { get; init; }

    public IReadOnlyList<AdminPaymentInvoiceDto> Invoices { get; init; } = [];

    public string? Error { get; init; }
}

public sealed class RefreshAdminMonoInvoicesRequestDto
{
    public required Guid UserId { get; init; }
}

public sealed class AdminPaymentInvoiceListResponseDto
{
    public bool Success { get; init; }

    public IReadOnlyList<AdminPaymentInvoiceDto> Invoices { get; init; } = [];

    public string? Error { get; init; }
}

public sealed class AdminPaymentInvoiceDto
{
    public required string InvoiceId { get; init; }

    public required string Label { get; init; }

    public required string Destination { get; init; }

    public required int AmountKopiyky { get; init; }

    public required string PageUrl { get; init; }

    public required string Reference { get; init; }

    public required string Status { get; init; }

    public bool IsPaid { get; init; }

    public bool IsDeleted { get; init; }

    public required DateTime CreatedAtUtc { get; init; }

    public required DateTime ExpiresAtUtc { get; init; }

    public DateTime? PaidAtUtc { get; init; }

    public DateTime? DeletedAtUtc { get; init; }
}

public sealed class DeleteAdminMonoInvoiceRequestDto
{
    public Guid UserId { get; init; }

    public required string InvoiceId { get; init; }
}

public sealed class DeleteAdminMonoInvoiceResponseDto
{
    public bool Success { get; init; }

    public IReadOnlyList<AdminPaymentInvoiceDto> Invoices { get; init; } = [];

    public string? Error { get; init; }
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
