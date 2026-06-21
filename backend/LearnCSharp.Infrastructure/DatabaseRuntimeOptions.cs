using LearnCSharp.Infrastructure.Persistence;

namespace LearnCSharp.Infrastructure;

public sealed class DatabaseRuntimeOptions(DatabaseProviderKind provider)
{
    public DatabaseProviderKind Provider { get; } = provider;
}
