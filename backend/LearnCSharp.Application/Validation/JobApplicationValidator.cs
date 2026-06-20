namespace LearnCSharp.Application.Validation;

public static class JobApplicationValidator
{
    private const int MaxTextLength = 2000;

    public static IReadOnlyList<string> ValidateSubmit(
        string fullName,
        string phone,
        int? age,
        string? experience,
        string? about)
    {
        var errors = new List<string>();
        var trimmedName = fullName.Trim();
        var trimmedPhone = phone.Trim();

        if (trimmedName.Length < 2)
        {
            errors.Add("Вкажіть ім'я та прізвище (мінімум 2 символи).");
        }

        if (trimmedName.Length > 100)
        {
            errors.Add("Ім'я занадто довге (макс. 100 символів).");
        }

        if (trimmedPhone.Length < 9)
        {
            errors.Add("Вкажіть коректний номер телефону.");
        }

        if (trimmedPhone.Length > 20)
        {
            errors.Add("Номер телефону занадто довгий.");
        }

        if (!age.HasValue)
        {
            errors.Add("Вкажіть вік (можна з 16 років).");
        }
        else if (age is < 16 or > 70)
        {
            errors.Add("Вік має бути від 16 до 70 років.");
        }

        var trimmedExperience = (experience ?? string.Empty).Trim();
        if (trimmedExperience.Length > MaxTextLength)
        {
            errors.Add($"Опис досвіду занадто довгий (макс. {MaxTextLength} символів).");
        }

        var trimmedAbout = (about ?? string.Empty).Trim();
        if (trimmedAbout.Length > MaxTextLength)
        {
            errors.Add($"Коментар занадто довгий (макс. {MaxTextLength} символів).");
        }

        return errors;
    }
}
