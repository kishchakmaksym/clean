using LearnCSharp.Application.DTOs.Reviews;
using LearnCSharp.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LearnCSharp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ReviewsController(IReviewService reviewService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ReviewResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ReviewResponseDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var reviews = await reviewService.GetAllAsync(cancellationToken);
        return Ok(reviews);
    }

    [HttpPost]
    [ProducesResponseType(typeof(CreateReviewResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(CreateReviewResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreateReviewResponseDto>> Create(
        [FromBody] CreateReviewRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await reviewService.CreateAsync(request, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("admin")]
    [ProducesResponseType(typeof(CreateReviewResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(CreateReviewResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CreateReviewResponseDto>> CreateAdminReview(
        [FromBody] AdminReviewRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await reviewService.CreateAdminReviewAsync(request, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
