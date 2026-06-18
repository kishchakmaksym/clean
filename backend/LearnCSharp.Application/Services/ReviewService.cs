using LearnCSharp.Application.DTOs.Reviews;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Application.Validation;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Application.Services;

public sealed class ReviewService(
    IReviewRepository reviewRepository,
    IUserRepository userRepository) : IReviewService
{
    public async Task<IReadOnlyList<ReviewResponseDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var reviews = await reviewRepository.GetAllAsync(cancellationToken);
        return reviews.Select(MapReview).ToList();
    }

    public async Task<CreateReviewResponseDto> CreateAsync(
        CreateReviewRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var validationErrors = ReviewValidator.ValidateCreate(
            request.UserId,
            request.Rating,
            request.Text);

        if (validationErrors.Count > 0)
        {
            return Failure(validationErrors);
        }

        var user = await userRepository.FindByIdAsync(request.UserId, cancellationToken);

        if (user is null)
        {
            return Failure(["Користувача не знайдено. Увійдіть знову."]);
        }

        if (user.Role == UserRole.Admin)
        {
            return Failure(["Адміністратор не може залишати звичайний відгук."]);
        }

        if (user.Role == UserRole.Employee)
        {
            return Failure(["Працівники не можуть залишати відгуки."]);
        }

        var review = new Review
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AuthorName = user.Name,
            Rating = request.Rating,
            Text = request.Text.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        await reviewRepository.AddAsync(review, cancellationToken);

        return new CreateReviewResponseDto
        {
            Success = true,
            Message = "Відгук опубліковано.",
            Review = MapReview(review)
        };
    }

    public async Task<CreateReviewResponseDto> CreateAdminReviewAsync(
        AdminReviewRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var validationErrors = ReviewValidator.ValidateAdminReview(
            request.AuthorName,
            request.Rating,
            request.Text,
            request.CreatedAtUtc);

        if (validationErrors.Count > 0)
        {
            return Failure(validationErrors);
        }

        var admin = await userRepository.FindByIdAsync(request.UserId, cancellationToken);

        if (admin is null)
        {
            return Failure(["Користувача не знайдено. Увійдіть знову."]);
        }

        if (admin.Role != UserRole.Admin)
        {
            return Failure(["Лише адміністратор може додавати відгуки вручну."]);
        }

        var review = new Review
        {
            Id = Guid.NewGuid(),
            UserId = null,
            AuthorName = request.AuthorName.Trim(),
            Rating = request.Rating,
            Text = request.Text.Trim(),
            CreatedAtUtc = request.CreatedAtUtc.ToUniversalTime()
        };

        await reviewRepository.AddAsync(review, cancellationToken);

        return new CreateReviewResponseDto
        {
            Success = true,
            Message = "Відгук додано.",
            Review = MapReview(review)
        };
    }

    public async Task<DeleteReviewResponseDto> DeleteAdminReviewAsync(
        DeleteReviewRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.UserId == Guid.Empty || request.ReviewId == Guid.Empty)
        {
            return DeleteFailure(["Некоректний запит на видалення."]);
        }

        var admin = await userRepository.FindByIdAsync(request.UserId, cancellationToken);

        if (admin is null)
        {
            return DeleteFailure(["Користувача не знайдено. Увійдіть знову."]);
        }

        if (admin.Role != UserRole.Admin)
        {
            return DeleteFailure(["Лише адміністратор може видаляти відгуки."]);
        }

        var review = await reviewRepository.FindByIdAsync(request.ReviewId, cancellationToken);

        if (review is null)
        {
            return DeleteFailure(["Відгук не знайдено."]);
        }

        await reviewRepository.DeleteAsync(review, cancellationToken);

        return new DeleteReviewResponseDto
        {
            Success = true,
            Message = "Відгук видалено."
        };
    }

    private static CreateReviewResponseDto Failure(IReadOnlyList<string> errors) =>
        new()
        {
            Success = false,
            Errors = errors
        };

    private static DeleteReviewResponseDto DeleteFailure(IReadOnlyList<string> errors) =>
        new()
        {
            Success = false,
            Errors = errors
        };

    private static ReviewResponseDto MapReview(Review review) =>
        new()
        {
            Id = review.Id,
            AuthorName = review.AuthorName,
            Rating = review.Rating,
            Text = review.Text,
            CreatedAtUtc = review.CreatedAtUtc
        };
}
