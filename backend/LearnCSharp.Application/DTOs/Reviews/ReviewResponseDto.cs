namespace LearnCSharp.Application.DTOs.Reviews;

public sealed class ReviewResponseDto
{
    public required Guid Id { get; init; }

    public required string AuthorName { get; init; }

    public required int Rating { get; init; }

    public required string Text { get; init; }

    public required DateTime CreatedAtUtc { get; init; }
}
