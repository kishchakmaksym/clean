namespace CleanPro.TelegramBot.Options;

public sealed class TelegramBotOptions
{
    public const string SectionName = "TelegramBot";

    public string BotToken { get; set; } = string.Empty;

    public int PollingTimeoutSeconds { get; set; } = 30;
}
