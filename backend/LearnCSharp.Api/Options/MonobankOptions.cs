namespace LearnCSharp.Api.Options;

public sealed class MonobankOptions
{
    public const string SectionName = "Monobank";

    public string Token { get; set; } = string.Empty;

    public string RedirectUrl { get; set; } = "http://localhost:5173/services?paid=1";

    public string? WebhookUrl { get; set; }
}
