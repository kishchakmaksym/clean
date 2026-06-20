namespace CleanPro.HiringTelegramBot.Options;

public sealed class HiringTelegramBotOptions
{
    public const string SectionName = "HiringTelegramBot";

    public string BotToken { get; set; } = string.Empty;

    /// <summary>Comma-separated Telegram chat IDs that receive new applications.</summary>
    public string NotifyChatIds { get; set; } = string.Empty;

    public IReadOnlyList<long> GetNotifyChatIds()
    {
        if (string.IsNullOrWhiteSpace(NotifyChatIds))
        {
            return [];
        }

        return NotifyChatIds
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(value => long.TryParse(value, out var chatId) ? chatId : 0)
            .Where(chatId => chatId != 0)
            .Distinct()
            .ToList();
    }
}
