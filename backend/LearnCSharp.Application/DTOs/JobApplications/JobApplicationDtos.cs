namespace LearnCSharp.Application.DTOs.JobApplications;

public sealed class SubmitJobApplicationRequestDto
{
    public required string FullName { get; set; }

    public required string Phone { get; set; }

    public int? Age { get; set; }

    public string? Experience { get; set; }

    public string? About { get; set; }
}

public sealed class JobApplicationResponseDto
{
    public Guid Id { get; set; }

    public required string FullName { get; set; }

    public required string Phone { get; set; }

    public int? Age { get; set; }

    public required string Experience { get; set; }

    public required string About { get; set; }

    public required string Status { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class SubmitJobApplicationResponseDto
{
    public bool Success { get; set; }

    public string? Message { get; set; }

    public IReadOnlyList<string>? Errors { get; set; }

    public JobApplicationResponseDto? Application { get; set; }
}

public sealed class AdminJobApplicationsResponseDto
{
    public IReadOnlyList<JobApplicationResponseDto> Applications { get; set; } = [];
}

public sealed class UpdateJobApplicationStatusRequestDto
{
    public Guid UserId { get; set; }

    public Guid ApplicationId { get; set; }

    public required string Status { get; set; }
}

public sealed class UpdateJobApplicationStatusResponseDto
{
    public bool Success { get; set; }

    public string? Message { get; set; }

    public IReadOnlyList<string>? Errors { get; set; }

    public JobApplicationResponseDto? Application { get; set; }
}
