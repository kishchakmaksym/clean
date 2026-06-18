namespace LearnCSharp.Application.DTOs.Reviews;

public sealed class AdminReviewRequestDto
{
    public required Guid UserId { get; init; }

    public required string AuthorName { get; init; }

    public required int Rating { get; init; }

    public required string Text { get; init; }

    public required DateTime CreatedAtUtc { get; init; }
}
