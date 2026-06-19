using LearnCSharp.Application.DTOs.Orders;
using LearnCSharp.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LearnCSharp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class OrdersController(IOrderService orderService) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(CreateOrderResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(CreateOrderResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreateOrderResponseDto>> Create(
        [FromBody] CreateOrderRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await orderService.CreateAsync(request, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<OrderResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<OrderResponseDto>>> GetForUser(
        [FromQuery] Guid userId,
        CancellationToken cancellationToken)
    {
        var orders = await orderService.GetForUserAsync(userId, cancellationToken);
        return Ok(orders);
    }

    [HttpPatch("status")]
    [ProducesResponseType(typeof(UpdateOrderStatusResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(UpdateOrderStatusResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UpdateOrderStatusResponseDto>> UpdateStatus(
        [FromBody] UpdateOrderStatusRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await orderService.UpdateStatusAsync(request, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("finalize-card")]
    [ProducesResponseType(typeof(CreateOrderResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(CreateOrderResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreateOrderResponseDto>> FinalizeCardPayment(
        [FromBody] FinalizeCardOrderRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await orderService.FinalizeCardPaymentAsync(request, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("finalize-card/latest")]
    [ProducesResponseType(typeof(CreateOrderResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(CreateOrderResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreateOrderResponseDto>> FinalizeLatestCardPayment(
        [FromQuery] Guid userId,
        CancellationToken cancellationToken)
    {
        var result = await orderService.FinalizeLatestCardPaymentAsync(userId, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
