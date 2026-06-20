using LearnCSharp.Application.DTOs.JobApplications;

namespace LearnCSharp.Application.Interfaces;

public interface IJobApplicationService
{
    Task<SubmitJobApplicationResponseDto> SubmitAsync(
        SubmitJobApplicationRequestDto request,
        CancellationToken cancellationToken = default);

    Task<AdminJobApplicationsResponseDto?> GetForAdminAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<UpdateJobApplicationStatusResponseDto> UpdateStatusAsync(
        UpdateJobApplicationStatusRequestDto request,
        CancellationToken cancellationToken = default);
}
