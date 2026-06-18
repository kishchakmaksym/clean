using LearnCSharp.Application.Interfaces;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LearnCSharp.Infrastructure.Repositories;

public sealed class ReviewRepository(AppDbContext dbContext) : IReviewRepository
{
    public async Task<IReadOnlyList<Review>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await dbContext.Reviews
            .AsNoTracking()
            .OrderByDescending(review => review.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(Review review, CancellationToken cancellationToken = default)
    {
        dbContext.Reviews.Add(review);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<Review?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Reviews.FirstOrDefaultAsync(review => review.Id == id, cancellationToken);

    public async Task DeleteAsync(Review review, CancellationToken cancellationToken = default)
    {
        dbContext.Reviews.Remove(review);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
