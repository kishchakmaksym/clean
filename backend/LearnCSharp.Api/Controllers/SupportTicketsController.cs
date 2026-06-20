using LearnCSharp.Application.DTOs.Support;
using LearnCSharp.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LearnCSharp.Api.Controllers;

[ApiController]
[Route("api/support")]
public sealed class SupportTicketsController(ISupportTicketService supportTicketService) : ControllerBase
{
    [HttpGet("tickets")]
    [ProducesResponseType(typeof(SupportTicketsResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SupportTicketsResponseDto>> GetUserTickets(
        [FromQuery] Guid userId,
        CancellationToken cancellationToken)
    {
        var result = await supportTicketService.GetTicketsForUserAsync(userId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("tickets/{ticketId:guid}")]
    [ProducesResponseType(typeof(SupportMessagesResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupportMessagesResponseDto>> GetUserTicketThread(
        Guid ticketId,
        [FromQuery] Guid userId,
        [FromQuery] DateTime? sinceUtc,
        CancellationToken cancellationToken)
    {
        var result = await supportTicketService.GetTicketThreadAsync(userId, ticketId, sinceUtc, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("tickets")]
    [ProducesResponseType(typeof(SupportActionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(SupportActionResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SupportActionResponseDto>> CreateTicket(
        [FromBody] CreateSupportTicketRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await supportTicketService.CreateTicketAsync(request, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("messages")]
    [ProducesResponseType(typeof(SupportActionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(SupportActionResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SupportActionResponseDto>> SendUserMessage(
        [FromBody] SendSupportMessageRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await supportTicketService.SendUserMessageAsync(request, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("admin/tickets")]
    [ProducesResponseType(typeof(SupportTicketsResponseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SupportTicketsResponseDto>> GetAdminTickets(
        [FromQuery] Guid userId,
        CancellationToken cancellationToken)
    {
        var result = await supportTicketService.GetTicketsForAdminAsync(userId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("admin/tickets/{ticketId:guid}")]
    [ProducesResponseType(typeof(SupportMessagesResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupportMessagesResponseDto>> GetAdminTicketThread(
        Guid ticketId,
        [FromQuery] Guid userId,
        [FromQuery] DateTime? sinceUtc,
        CancellationToken cancellationToken)
    {
        var result = await supportTicketService.GetTicketThreadForAdminAsync(userId, ticketId, sinceUtc, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("admin/messages")]
    [ProducesResponseType(typeof(SupportActionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(SupportActionResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SupportActionResponseDto>> SendStaffMessage(
        [FromBody] AdminSupportMessageRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await supportTicketService.SendStaffMessageAsync(request, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("tickets/{ticketId:guid}/typing")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SetUserTyping(
        Guid ticketId,
        [FromQuery] Guid userId,
        CancellationToken cancellationToken)
    {
        await supportTicketService.SetUserTypingAsync(userId, ticketId, cancellationToken);
        return NoContent();
    }

    [HttpPost("admin/tickets/{ticketId:guid}/typing")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SetStaffTyping(
        Guid ticketId,
        [FromQuery] Guid userId,
        CancellationToken cancellationToken)
    {
        await supportTicketService.SetStaffTypingAsync(userId, ticketId, cancellationToken);
        return NoContent();
    }

    [HttpPost("admin/tickets/{ticketId:guid}/close")]
    [ProducesResponseType(typeof(SupportActionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(SupportActionResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SupportActionResponseDto>> CloseTicket(
        Guid ticketId,
        [FromQuery] Guid userId,
        CancellationToken cancellationToken)
    {
        var result = await supportTicketService.CloseTicketAsync(userId, ticketId, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
