namespace LearnCSharp.Infrastructure.Options;

public sealed class MonobankOptions
{
    public const string SectionName = "Monobank";

    public string Token { get; set; } = string.Empty;

    public string RedirectUrl { get; set; } = "http://localhost:5173/profile/orders?paid=1";

    public string? WebhookUrl { get; set; }
}
