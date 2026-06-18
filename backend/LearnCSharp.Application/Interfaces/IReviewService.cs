using LearnCSharp.Application.DTOs.Reviews;

namespace LearnCSharp.Application.Interfaces;

public interface IReviewService
{
    Task<IReadOnlyList<ReviewResponseDto>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<CreateReviewResponseDto> CreateAsync(
        CreateReviewRequestDto request,
        CancellationToken cancellationToken = default);

    Task<CreateReviewResponseDto> CreateAdminReviewAsync(
        AdminReviewRequestDto request,
        CancellationToken cancellationToken = default);
}
