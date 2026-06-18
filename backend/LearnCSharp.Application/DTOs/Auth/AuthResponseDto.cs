namespace LearnCSharp.Application.DTOs.Auth;

public sealed class AuthResponseDto
{
    public required bool Success { get; init; }

    public string? Message { get; init; }

    public UserResponseDto? User { get; init; }

    public IReadOnlyList<string>? Errors { get; init; }
}
