using System.Text.Json;
using LearnCSharp.Application.DTOs.Orders;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Application.Services;

public sealed class OrderService(
    IOrderRepository orderRepository,
    IUserRepository userRepository,
    IPendingCardOrderRepository pendingCardOrderRepository,
    IMonoPaymentClient monoPaymentClient) : IOrderService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<CreateOrderResponseDto> CreateAsync(
        CreateOrderRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var validationErrors = ValidateCreate(request);
        if (validationErrors.Count > 0)
        {
            return CreateFailure(validationErrors);
        }

        var user = await userRepository.FindByIdAsync(request.UserId, cancellationToken);
        if (user is null)
        {
            return CreateFailure(["Користувача не знайдено. Увійдіть знову."]);
        }

        if (user.Role is UserRole.Admin or UserRole.Employee)
        {
            return CreateFailure(["Замовлення можуть оформлювати лише клієнти."]);
        }

        var order = new Order
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Status = OrderStatus.PendingConfirmation,
            ServiceId = request.ServiceId.Trim(),
            ServiceTitle = request.ServiceTitle.Trim(),
            OrderType = request.OrderType.Trim(),
            AreaSqm = request.AreaSqm,
            Rooms = request.Rooms,
            Bathrooms = request.Bathrooms,
            SelectedAddonsJson = SerializeAddons(request.SelectedAddons),
            TimeSlot = request.TimeSlot.Trim(),
            TimeSlotLabel = request.TimeSlotLabel.Trim(),
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            PaymentMethod = request.PaymentMethod.Trim(),
            TotalAmount = request.TotalAmount,
            PayableAmount = request.PayableAmount,
            CreatedAtUtc = DateTime.UtcNow,
        };

        await orderRepository.AddAsync(order, cancellationToken);

        return new CreateOrderResponseDto
        {
            Success = true,
            Message = "Замовлення створено.",
            Order = MapOrder(order, user.Name),
        };
    }

    public async Task<IReadOnlyList<OrderResponseDto>> GetForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var user = await userRepository.FindByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return [];
        }

        IReadOnlyList<Order> orders = user.Role switch
        {
            UserRole.Admin => await orderRepository.GetAllAsync(cancellationToken),
            UserRole.Employee => await orderRepository.GetAllAsync(cancellationToken),
            _ => await orderRepository.GetByUserIdAsync(userId, cancellationToken),
        };

        return orders
            .Select(order => MapOrder(order, order.User?.Name ?? "Клієнт"))
            .ToList();
    }

    public async Task<UpdateOrderStatusResponseDto> UpdateStatusAsync(
        UpdateOrderStatusRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var actor = await userRepository.FindByIdAsync(request.UserId, cancellationToken);
        if (actor is null)
        {
            return UpdateFailure(["Користувача не знайдено."]);
        }

        if (!TryParseStatus(request.Status, out var targetStatus))
        {
            return UpdateFailure(["Невідомий статус замовлення."]);
        }

        var order = await orderRepository.FindByIdAsync(request.OrderId, cancellationToken);
        if (order is null)
        {
            return UpdateFailure(["Замовлення не знайдено."]);
        }

        if (actor.Role == UserRole.Admin)
        {
            if (targetStatus == OrderStatus.Confirmed && order.Status != OrderStatus.PendingConfirmation)
            {
                return UpdateFailure(["Підтвердити можна лише замовлення, що чекають підтвердження."]);
            }

            if (targetStatus == OrderStatus.Completed && order.Status != OrderStatus.Confirmed)
            {
                return UpdateFailure(["Завершити можна лише підтверджене замовлення."]);
            }
        }
        else if (actor.Role == UserRole.Employee)
        {
            if (targetStatus != OrderStatus.Completed || order.Status != OrderStatus.Confirmed)
            {
                return UpdateFailure(["Працівник може позначити виконаним лише підтверджене замовлення."]);
            }
        }
        else
        {
            return UpdateFailure(["Недостатньо прав для зміни статусу."]);
        }

        order.Status = targetStatus;
        order.UpdatedAtUtc = DateTime.UtcNow;
        await orderRepository.UpdateAsync(order, cancellationToken);

        return new UpdateOrderStatusResponseDto
        {
            Success = true,
            Message = targetStatus switch
            {
                OrderStatus.Confirmed => "Замовлення підтверджено.",
                OrderStatus.Completed => "Замовлення позначено як виконане.",
                _ => "Статус оновлено.",
            },
            Order = MapOrder(order, order.User?.Name ?? "Клієнт"),
        };
    }

    public async Task<CreateOrderResponseDto> FinalizeCardPaymentAsync(
        FinalizeCardOrderRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.InvoiceId))
        {
            return CreateFailure(["Не вказано рахунок Monobank."]);
        }

        var pending = await pendingCardOrderRepository.FindByInvoiceIdAsync(
            request.InvoiceId.Trim(),
            cancellationToken);

        if (pending is null)
        {
            return CreateFailure(["Дані замовлення для цієї оплати не знайдено."]);
        }

        if (pending.UserId != request.UserId)
        {
            return CreateFailure(["Не вдалося підтвердити оплату для цього акаунта."]);
        }

        CreateOrderRequestDto? orderRequest;
        try
        {
            orderRequest = JsonSerializer.Deserialize<CreateOrderRequestDto>(
                pending.OrderPayloadJson,
                JsonOptions);
        }
        catch (JsonException)
        {
            return CreateFailure(["Не вдалося прочитати дані замовлення."]);
        }

        if (orderRequest is null)
        {
            return CreateFailure(["Не вдалося прочитати дані замовлення."]);
        }

        var paymentStatus = await monoPaymentClient.WaitForSuccessfulPaymentAsync(
            request.InvoiceId.Trim(),
            cancellationToken);

        if (!paymentStatus.Success)
        {
            return CreateFailure([paymentStatus.Error ?? "Не вдалося перевірити статус оплати."]);
        }

        if (!paymentStatus.IsPaid)
        {
            return CreateFailure([
                paymentStatus.FailureReason ?? "Оплата не пройшла. Замовлення не створено.",
            ]);
        }

        var result = await CreateAsync(orderRequest, cancellationToken);
        if (result.Success)
        {
            await pendingCardOrderRepository.DeleteAsync(request.InvoiceId.Trim(), cancellationToken);
        }

        return result;
    }

    public async Task<CreateOrderResponseDto> FinalizeLatestCardPaymentAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var pending = await pendingCardOrderRepository.FindLatestByUserIdAsync(userId, cancellationToken);
        if (pending is null)
        {
            return CreateFailure(["Дані замовлення для цієї оплати не знайдено."]);
        }

        return await FinalizeCardPaymentAsync(
            new FinalizeCardOrderRequestDto
            {
                UserId = userId,
                InvoiceId = pending.InvoiceId,
            },
            cancellationToken);
    }

    private static List<string> ValidateCreate(CreateOrderRequestDto request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.ServiceId))
        {
            errors.Add("Не вказано послугу.");
        }

        if (string.IsNullOrWhiteSpace(request.ServiceTitle))
        {
            errors.Add("Не вказано назву послуги.");
        }

        if (request.OrderType is not ("fixed" or "custom"))
        {
            errors.Add("Невідомий тип замовлення.");
        }

        if (string.IsNullOrWhiteSpace(request.TimeSlot) || string.IsNullOrWhiteSpace(request.TimeSlotLabel))
        {
            errors.Add("Оберіть бажаний час прибирання.");
        }

        if (request.PaymentMethod is not ("card" or "cash"))
        {
            errors.Add("Оберіть спосіб оплати.");
        }

        if (request.TotalAmount < 1 || request.PayableAmount < 1)
        {
            errors.Add("Сума замовлення має бути не менше 1 ₴.");
        }

        return errors;
    }

    private static bool TryParseStatus(string value, out OrderStatus status)
    {
        if (Enum.TryParse<OrderStatus>(value, ignoreCase: true, out status))
        {
            return status is OrderStatus.Confirmed or OrderStatus.Completed;
        }

        status = default;
        return false;
    }

    private static string? SerializeAddons(IReadOnlyList<string>? addons)
    {
        if (addons is null || addons.Count == 0)
        {
            return null;
        }

        return JsonSerializer.Serialize(addons, JsonOptions);
    }

    private static IReadOnlyList<string> DeserializeAddons(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<string>>(json, JsonOptions) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static OrderResponseDto MapOrder(Order order, string customerName) =>
        new()
        {
            Id = order.Id,
            UserId = order.UserId,
            CustomerName = customerName,
            Status = order.Status.ToString(),
            ServiceId = order.ServiceId,
            ServiceTitle = order.ServiceTitle,
            OrderType = order.OrderType,
            AreaSqm = order.AreaSqm,
            Rooms = order.Rooms,
            Bathrooms = order.Bathrooms,
            SelectedAddons = DeserializeAddons(order.SelectedAddonsJson),
            TimeSlot = order.TimeSlot,
            TimeSlotLabel = order.TimeSlotLabel,
            Notes = order.Notes,
            PaymentMethod = order.PaymentMethod,
            TotalAmount = order.TotalAmount,
            PayableAmount = order.PayableAmount,
            CreatedAtUtc = order.CreatedAtUtc,
            UpdatedAtUtc = order.UpdatedAtUtc,
        };

    private static CreateOrderResponseDto CreateFailure(IReadOnlyList<string> errors) =>
        new() { Success = false, Errors = errors };

    private static UpdateOrderStatusResponseDto UpdateFailure(IReadOnlyList<string> errors) =>
        new() { Success = false, Errors = errors };
}
