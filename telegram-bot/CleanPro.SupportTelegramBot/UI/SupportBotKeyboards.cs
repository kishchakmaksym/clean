using Telegram.Bot.Types.ReplyMarkups;

namespace CleanPro.SupportTelegramBot.UI;

internal static class SupportBotCallbacks
{
    public const string Prefix = "s:";
    public const string MenuTickets = Prefix + "tickets";
    public const string MenuHome = Prefix + "home";

    public static string Ticket(Guid ticketId) => Prefix + "ticket:" + ticketId.ToString("N");
    public static string CloseTicket(Guid ticketId) => Prefix + "close:" + ticketId.ToString("N");

    public static bool TryParseTicketId(string data, out Guid ticketId)
    {
        ticketId = Guid.Empty;
        if (!data.StartsWith(Prefix + "ticket:", StringComparison.Ordinal))
        {
            return false;
        }

        var raw = data[(Prefix.Length + "ticket:".Length)..];
        return Guid.TryParseExact(raw, "N", out ticketId);
    }

    public static bool TryParseCloseId(string data, out Guid ticketId)
    {
        ticketId = Guid.Empty;
        if (!data.StartsWith(Prefix + "close:", StringComparison.Ordinal))
        {
            return false;
        }

        var raw = data[(Prefix.Length + "close:".Length)..];
        return Guid.TryParseExact(raw, "N", out ticketId);
    }
}

internal static class SupportBotKeyboards
{
    public static ReplyKeyboardMarkup LoginContact() =>
        new(
            [
                [KeyboardButton.WithRequestContact("📱 Надіслати номер телефону")],
            ])
        {
            ResizeKeyboard = true,
            OneTimeKeyboard = true,
        };

    public static InlineKeyboardMarkup MainMenu() =>
        new(
            [
                [InlineKeyboardButton.WithCallbackData("📋 Звернення", SupportBotCallbacks.MenuTickets)],
            ]);

    public static InlineKeyboardMarkup TicketActions(Guid ticketId, bool canClose) =>
        canClose
            ? new(
                [
                    [InlineKeyboardButton.WithCallbackData("✉️ Відповісти", SupportBotCallbacks.Ticket(ticketId))],
                    [InlineKeyboardButton.WithCallbackData("✅ Закрити", SupportBotCallbacks.CloseTicket(ticketId))],
                    [InlineKeyboardButton.WithCallbackData("◀️ До списку", SupportBotCallbacks.MenuTickets)],
                ])
            : new(
                [
                    [InlineKeyboardButton.WithCallbackData("◀️ До списку", SupportBotCallbacks.MenuTickets)],
                ]);
}
