using LearnCSharp.Domain.Entities;

namespace LearnCSharp.Application.Interfaces;

public interface IReviewRepository
{
    Task<IReadOnlyList<Review>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<Review?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task AddAsync(Review review, CancellationToken cancellationToken = default);

    Task DeleteAsync(Review review, CancellationToken cancellationToken = default);
}
