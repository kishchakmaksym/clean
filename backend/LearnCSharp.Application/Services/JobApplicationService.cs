using LearnCSharp.Application.DTOs.JobApplications;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Application.Validation;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Application.Services;

public sealed class JobApplicationService(
    IJobApplicationRepository jobApplicationRepository,
    IUserRepository userRepository) : IJobApplicationService
{
    public async Task<SubmitJobApplicationResponseDto> SubmitAsync(
        SubmitJobApplicationRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var validationErrors = JobApplicationValidator.ValidateSubmit(
            request.FullName,
            request.Phone,
            request.Age,
            request.Experience,
            request.About);

        if (validationErrors.Count > 0)
        {
            return new SubmitJobApplicationResponseDto
            {
                Success = false,
                Errors = validationErrors,
            };
        }

        var now = DateTime.UtcNow;
        var application = new JobApplication
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Phone = request.Phone.Trim(),
            Age = request.Age,
            Experience = (request.Experience ?? string.Empty).Trim(),
            About = (request.About ?? string.Empty).Trim(),
            Status = JobApplicationStatus.New,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
        };

        await jobApplicationRepository.AddAsync(application, cancellationToken);
        await jobApplicationRepository.EnqueueOutboxAsync(
            new HiringOutboxMessage
            {
                Id = Guid.NewGuid(),
                ApplicationId = application.Id,
                CreatedAtUtc = now,
            },
            cancellationToken);

        return new SubmitJobApplicationResponseDto
        {
            Success = true,
            Message = "Дякуємо! Заявку надіслано — ми зв'яжемося з вами найближчим часом.",
            Application = MapApplication(application),
        };
    }

    public async Task<AdminJobApplicationsResponseDto?> GetForAdminAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        if (!await IsAdminAsync(userId, cancellationToken))
        {
            return null;
        }

        var applications = await jobApplicationRepository.GetAllAsync(cancellationToken);
        return new AdminJobApplicationsResponseDto
        {
            Applications = applications.Select(MapApplication).ToList(),
        };
    }

    public async Task<UpdateJobApplicationStatusResponseDto> UpdateStatusAsync(
        UpdateJobApplicationStatusRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (!await IsAdminAsync(request.UserId, cancellationToken))
        {
            return Failure(["Немає доступу."]);
        }

        if (!TryParseStatus(request.Status, out var status))
        {
            return Failure(["Невідомий статус заявки."]);
        }

        var application = await jobApplicationRepository.FindByIdAsync(request.ApplicationId, cancellationToken);
        if (application is null)
        {
            return Failure(["Заявку не знайдено."]);
        }

        application.Status = status;
        application.UpdatedAtUtc = DateTime.UtcNow;
        await jobApplicationRepository.UpdateAsync(application, cancellationToken);

        return new UpdateJobApplicationStatusResponseDto
        {
            Success = true,
            Message = "Статус оновлено.",
            Application = MapApplication(application),
        };
    }

    private static UpdateJobApplicationStatusResponseDto Failure(IReadOnlyList<string> errors) =>
        new()
        {
            Success = false,
            Errors = errors,
        };

    private async Task<bool> IsAdminAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByIdAsync(userId, cancellationToken);
        return user?.Role == UserRole.Admin;
    }

    private static bool TryParseStatus(string value, out JobApplicationStatus status)
    {
        if (Enum.TryParse<JobApplicationStatus>(value, true, out status))
        {
            return true;
        }

        return value switch
        {
            "Нова" => Assign(JobApplicationStatus.New, out status),
            "На зв'язку" => Assign(JobApplicationStatus.Contacted, out status),
            "Прийнята" => Assign(JobApplicationStatus.Accepted, out status),
            "Відхилена" => Assign(JobApplicationStatus.Rejected, out status),
            _ => false,
        };
    }

    private static bool Assign(JobApplicationStatus value, out JobApplicationStatus status)
    {
        status = value;
        return true;
    }

    private static JobApplicationResponseDto MapApplication(JobApplication application) =>
        new()
        {
            Id = application.Id,
            FullName = application.FullName,
            Phone = application.Phone,
            Age = application.Age,
            Experience = application.Experience,
            About = application.About,
            Status = application.Status.ToString(),
            CreatedAtUtc = application.CreatedAtUtc,
            UpdatedAtUtc = application.UpdatedAtUtc,
        };
}
