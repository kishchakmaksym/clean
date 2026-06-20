using LearnCSharp.Application.DTOs.Orders;

namespace LearnCSharp.Application.Interfaces;

public interface IOrderService
{
    Task<CreateOrderResponseDto> CreateAsync(
        CreateOrderRequestDto request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OrderResponseDto>> GetForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<UpdateOrderStatusResponseDto> UpdateStatusAsync(
        UpdateOrderStatusRequestDto request,
        CancellationToken cancellationToken = default);

    Task<UpdateOrderStatusResponseDto> CancelAsync(
        CancelOrderRequestDto request,
        CancellationToken cancellationToken = default);

    Task<CreateOrderResponseDto> FinalizeCardPaymentAsync(
        FinalizeCardOrderRequestDto request,
        CancellationToken cancellationToken = default);

    Task<CreateOrderResponseDto> FinalizeLatestCardPaymentAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
}
