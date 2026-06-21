using System.Collections.Concurrent;

using LearnCSharp.Application.DTOs.Telegram;

namespace CleanPro.TelegramBot.State;

public enum UserSessionMode
{
    None = 0,
    AwaitingBroadcast = 1,
    AwaitingEmployeeShare = 2,
}

public enum UserNavigationContext
{
    Main = 0,
    AvailableOrders = 1,
    MyOrders = 2,
    Stats = 3,
    Admin = 4,
    Employees = 5,
    EmployeeDetail = 6,
    OrderDetail = 7,
    Logs = 8,
    LogsFilter = 9,
}

public sealed class UserSession
{
    public UserSessionMode Mode { get; set; }

    public UserNavigationContext Nav { get; set; } = UserNavigationContext.Main;

    public UserNavigationContext ReturnNav { get; set; } = UserNavigationContext.Main;

    public Guid? TargetEmployeeId { get; set; }

    public Guid? TargetOrderId { get; set; }

    public StaffAuditLogPeriod? LogPeriod { get; set; }

    public int LogPage { get; set; }

    public int? LastBotMessageId { get; set; }

    public long? ActiveTelegramUserId { get; set; }

    public int? ActivePersistedScreenMessageId { get; set; }

    public List<int> EphemeralBotMessageIds { get; } = [];
}

public sealed class UserSessionStore
{
    private readonly ConcurrentDictionary<long, UserSession> _sessions = new();
    private readonly ConcurrentDictionary<long, SemaphoreSlim> _locks = new();

    public UserSession GetOrCreate(long telegramUserId) =>
        _sessions.GetOrAdd(telegramUserId, _ => new UserSession());

    public async Task<IAsyncDisposable> AcquireLockAsync(
        long telegramUserId,
        CancellationToken cancellationToken)
    {
        var gate = _locks.GetOrAdd(telegramUserId, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        return new SessionLock(gate);
    }

    public void Clear(long telegramUserId) =>
        _sessions.TryRemove(telegramUserId, out _);

    private sealed class SessionLock(SemaphoreSlim gate) : IAsyncDisposable
    {
        public ValueTask DisposeAsync()
        {
            gate.Release();
            return ValueTask.CompletedTask;
        }
    }
}
