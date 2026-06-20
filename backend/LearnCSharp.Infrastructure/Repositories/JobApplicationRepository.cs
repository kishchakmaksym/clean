using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LearnCSharp.Infrastructure.Repositories;

public sealed class JobApplicationRepository(AppDbContext dbContext) : IJobApplicationRepository
{
    public async Task<IReadOnlyList<JobApplication>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await dbContext.JobApplications
            .AsNoTracking()
            .OrderByDescending(application => application.CreatedAtUtc)
            .ThenByDescending(application => application.Id)
            .ToListAsync(cancellationToken);

    public Task<JobApplication?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.JobApplications.FirstOrDefaultAsync(application => application.Id == id, cancellationToken);

    public async Task AddAsync(JobApplication application, CancellationToken cancellationToken = default)
    {
        dbContext.JobApplications.Add(application);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(JobApplication application, CancellationToken cancellationToken = default)
    {
        dbContext.JobApplications.Update(application);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task EnqueueOutboxAsync(HiringOutboxMessage message, CancellationToken cancellationToken = default)
    {
        dbContext.HiringOutboxMessages.Add(message);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<HiringOutboxMessage>> GetPendingOutboxAsync(
        int limit,
        CancellationToken cancellationToken = default) =>
        await dbContext.HiringOutboxMessages
            .Where(message => message.ProcessedAtUtc == null)
            .OrderBy(message => message.CreatedAtUtc)
            .Take(limit)
            .ToListAsync(cancellationToken);

    public async Task MarkOutboxProcessedAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var message = await dbContext.HiringOutboxMessages.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (message is null)
        {
            return;
        }

        message.ProcessedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
