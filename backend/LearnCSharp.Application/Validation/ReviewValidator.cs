namespace LearnCSharp.Application.Validation;

public static class ReviewValidator
{
    private const int MaxTextLength = 2000;

    public static IReadOnlyList<string> ValidateCreate(Guid userId, int rating, string? text)
    {
        var errors = new List<string>();

        if (userId == Guid.Empty)
        {
            errors.Add("Потрібно увійти в обліковий запис, щоб залишити відгук.");
        }

        errors.AddRange(ValidateRatingAndText(rating, text));

        return errors;
    }

    public static IReadOnlyList<string> ValidateAdminReview(
        string? authorName,
        int rating,
        string? text,
        DateTime createdAtUtc)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(authorName))
        {
            errors.Add("Ім'я автора є обов'язковим.");
        }
        else
        {
            var trimmedName = authorName.Trim();

            if (trimmedName.Length < 2 || trimmedName.Length > 100)
            {
                errors.Add("Ім'я має містити від 2 до 100 символів.");
            }
        }

        errors.AddRange(ValidateRatingAndText(rating, text));

        if (createdAtUtc == default)
        {
            errors.Add("Дата відгуку є обов'язковою.");
        }
        else if (createdAtUtc.ToUniversalTime() > DateTime.UtcNow.AddMinutes(5))
        {
            errors.Add("Дата відгуку не може бути в майбутньому.");
        }

        return errors;
    }

    private static IEnumerable<string> ValidateRatingAndText(int rating, string? text)
    {
        var errors = new List<string>();

        if (rating is < 1 or > 5)
        {
            errors.Add("Оцінка має бути від 1 до 5 зірок.");
        }

        var trimmed = (text ?? string.Empty).Trim();

        if (trimmed.Length > MaxTextLength)
        {
            errors.Add($"Відгук не може перевищувати {MaxTextLength} символів.");
        }

        return errors;
    }
}
