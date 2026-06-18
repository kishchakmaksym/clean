namespace LearnCSharp.Application.DTOs.Reviews;

public sealed class DeleteReviewResponseDto
{
    public required bool Success { get; init; }

    public string? Message { get; init; }

    public IReadOnlyList<string>? Errors { get; init; }
}
