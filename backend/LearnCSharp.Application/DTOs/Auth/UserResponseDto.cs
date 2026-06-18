namespace LearnCSharp.Application.DTOs.Auth;

public sealed class UserResponseDto
{
    public required Guid Id { get; init; }

    public required string Name { get; init; }

    public required string Email { get; init; }

    public required string Phone { get; init; }
}
