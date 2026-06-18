namespace LearnCSharp.Application.DTOs.Auth;

public sealed class RegisterRequestDto
{
    public required string Name { get; init; }

    public required string Email { get; init; }

    public required string Phone { get; init; }

    public required string Password { get; init; }

    public required string ConfirmPassword { get; init; }
}
