using System.Collections.Concurrent;

namespace CleanPro.TelegramBot.State;

public enum UserSessionMode
{
    None = 0,
    AwaitingBroadcast = 1,
    AwaitingEmployeeShare = 2,
}

public sealed class UserSession
{
    public UserSessionMode Mode { get; set; }

    public Guid? TargetEmployeeId { get; set; }
}

public sealed class UserSessionStore
{
    private readonly ConcurrentDictionary<long, UserSession> _sessions = new();

    public UserSession GetOrCreate(long telegramUserId) =>
        _sessions.GetOrAdd(telegramUserId, _ => new UserSession());

    public void Clear(long telegramUserId) =>
        _sessions.TryRemove(telegramUserId, out _);
}
