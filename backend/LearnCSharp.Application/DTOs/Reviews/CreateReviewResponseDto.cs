namespace LearnCSharp.Application.DTOs.Reviews;

public sealed class CreateReviewResponseDto
{
    public required bool Success { get; init; }

    public string? Message { get; init; }

    public ReviewResponseDto? Review { get; init; }

    public IReadOnlyList<string>? Errors { get; init; }
}
