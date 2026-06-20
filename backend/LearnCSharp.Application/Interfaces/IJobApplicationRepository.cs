using LearnCSharp.Domain.Entities;

namespace LearnCSharp.Application.Interfaces;

public interface IJobApplicationRepository
{
    Task<IReadOnlyList<JobApplication>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<JobApplication?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task AddAsync(JobApplication application, CancellationToken cancellationToken = default);

    Task UpdateAsync(JobApplication application, CancellationToken cancellationToken = default);

    Task EnqueueOutboxAsync(HiringOutboxMessage message, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<HiringOutboxMessage>> GetPendingOutboxAsync(
        int limit,
        CancellationToken cancellationToken = default);

    Task MarkOutboxProcessedAsync(Guid id, CancellationToken cancellationToken = default);
}
