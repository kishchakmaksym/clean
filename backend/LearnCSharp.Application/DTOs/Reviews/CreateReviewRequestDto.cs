namespace LearnCSharp.Application.DTOs.Reviews;

public sealed class CreateReviewRequestDto
{
    public required Guid UserId { get; init; }

    public required int Rating { get; init; }

    public string? Text { get; init; }
}
