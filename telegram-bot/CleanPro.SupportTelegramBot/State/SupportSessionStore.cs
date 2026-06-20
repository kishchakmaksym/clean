namespace CleanPro.SupportTelegramBot.State;

public enum SupportSessionMode
{
    Idle = 0,
    AwaitingReply = 1,
}

public sealed class SupportUserSession
{
    public SupportSessionMode Mode { get; set; } = SupportSessionMode.Idle;

    public Guid? ActiveTicketId { get; set; }
}

public sealed class SupportSessionStore
{
    private readonly Dictionary<long, SupportUserSession> _sessions = new();

    public SupportUserSession GetOrCreate(long telegramUserId)
    {
        if (!_sessions.TryGetValue(telegramUserId, out var session))
        {
            session = new SupportUserSession();
            _sessions[telegramUserId] = session;
        }

        return session;
    }

    public void Clear(long telegramUserId) => _sessions.Remove(telegramUserId);

    public void SetReplyMode(long telegramUserId, Guid ticketId)
    {
        var session = GetOrCreate(telegramUserId);
        session.Mode = SupportSessionMode.AwaitingReply;
        session.ActiveTicketId = ticketId;
    }

    public void ClearReplyMode(long telegramUserId)
    {
        var session = GetOrCreate(telegramUserId);
        session.Mode = SupportSessionMode.Idle;
        session.ActiveTicketId = null;
    }
}
