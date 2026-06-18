namespace LearnCSharp.Application.DTOs.Reviews;

public sealed class DeleteReviewRequestDto
{
    public required Guid UserId { get; init; }

    public required Guid ReviewId { get; init; }
}
