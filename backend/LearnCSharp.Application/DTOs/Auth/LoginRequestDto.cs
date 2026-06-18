namespace LearnCSharp.Application.DTOs.Auth;

public sealed class LoginRequestDto
{
    public required string Login { get; init; }

    public required string Password { get; init; }
}
