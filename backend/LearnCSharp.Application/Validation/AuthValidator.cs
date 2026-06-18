using System.Text.RegularExpressions;

namespace LearnCSharp.Application.Validation;

public static partial class AuthValidator
{
    private const int MinPasswordLength = 8;
    private const int MaxPasswordLength = 128;
    private const int MinNameLength = 2;
    private const int MaxNameLength = 100;

    [GeneratedRegex(@"^[\p{L}\s'\-]+$", RegexOptions.Compiled)]
    private static partial Regex NamePattern();

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled | RegexOptions.IgnoreCase)]
    private static partial Regex EmailPattern();

    [GeneratedRegex(@"[A-Za-z]", RegexOptions.Compiled)]
    private static partial Regex PasswordLetterPattern();

    [GeneratedRegex(@"\d", RegexOptions.Compiled)]
    private static partial Regex PasswordDigitPattern();

    public static IReadOnlyList<string> ValidateRegister(
        string? name,
        string? email,
        string? phone,
        string? password,
        string? confirmPassword)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(name))
        {
            errors.Add("Ім'я є обов'язковим.");
        }
        else
        {
            var trimmedName = name.Trim();
            if (trimmedName.Length < MinNameLength || trimmedName.Length > MaxNameLength)
            {
                errors.Add($"Ім'я має містити від {MinNameLength} до {MaxNameLength} символів.");
            }
            else if (!NamePattern().IsMatch(trimmedName))
            {
                errors.Add("Ім'я може містити лише літери, пробіли, дефіс та апостроф.");
            }
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            errors.Add("Електронна пошта є обов'язковою.");
        }
        else if (!EmailPattern().IsMatch(email.Trim()))
        {
            errors.Add("Некоректний формат електронної пошти.");
        }

        if (string.IsNullOrWhiteSpace(phone))
        {
            errors.Add("Номер телефону є обов'язковим.");
        }
        else if (!TryNormalizePhone(phone, out _))
        {
            errors.Add("Некоректний формат номера телефону. Використовуйте український номер, наприклад +380501234567.");
        }

        errors.AddRange(ValidatePassword(password, confirmPassword));

        return errors;
    }

    public static IReadOnlyList<string> ValidateLogin(string? login, string? password)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(login))
        {
            errors.Add("Введіть електронну пошту або номер телефону.");
        }
        else
        {
            var trimmedLogin = login.Trim();
            if (trimmedLogin.Contains('@', StringComparison.Ordinal))
            {
                if (!EmailPattern().IsMatch(trimmedLogin))
                {
                    errors.Add("Некоректний формат електронної пошти.");
                }
            }
            else if (!TryNormalizePhone(trimmedLogin, out _))
            {
                errors.Add("Некоректний формат номера телефону.");
            }
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            errors.Add("Пароль є обов'язковим.");
        }
        else if (password.Length > MaxPasswordLength)
        {
            errors.Add($"Пароль не може перевищувати {MaxPasswordLength} символів.");
        }

        return errors;
    }

    public static string NormalizeEmail(string email) =>
        email.Trim().ToLowerInvariant();

    public static bool TryNormalizePhone(string phone, out string normalizedPhone)
    {
        normalizedPhone = string.Empty;

        if (string.IsNullOrWhiteSpace(phone))
        {
            return false;
        }

        var digits = new string(phone.Where(char.IsDigit).ToArray());

        if (digits.StartsWith("380", StringComparison.Ordinal) && digits.Length == 12)
        {
            normalizedPhone = $"+{digits}";
            return true;
        }

        if (digits.StartsWith('0') && digits.Length == 10)
        {
            normalizedPhone = $"+38{digits}";
            return true;
        }

        if (digits.Length == 9)
        {
            normalizedPhone = $"+380{digits}";
            return true;
        }

        return false;
    }

    private static IEnumerable<string> ValidatePassword(string? password, string? confirmPassword)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(password))
        {
            errors.Add("Пароль є обов'язковим.");
            return errors;
        }

        if (password.Length < MinPasswordLength)
        {
            errors.Add($"Пароль має містити щонайменше {MinPasswordLength} символів.");
        }

        if (password.Length > MaxPasswordLength)
        {
            errors.Add($"Пароль не може перевищувати {MaxPasswordLength} символів.");
        }

        if (!PasswordLetterPattern().IsMatch(password))
        {
            errors.Add("Пароль має містити хоча б одну літеру.");
        }

        if (!PasswordDigitPattern().IsMatch(password))
        {
            errors.Add("Пароль має містити хоча б одну цифру.");
        }

        if (string.IsNullOrWhiteSpace(confirmPassword))
        {
            errors.Add("Підтвердження пароля є обов'язковим.");
        }
        else if (!string.Equals(password, confirmPassword, StringComparison.Ordinal))
        {
            errors.Add("Паролі не збігаються.");
        }

        return errors;
    }
}
