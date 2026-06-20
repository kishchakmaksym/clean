using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Domain.Entities;

public class JobApplication
{
    public Guid Id { get; set; }

    public required string FullName { get; set; }

    public required string Phone { get; set; }

    public int? Age { get; set; }

    public string Experience { get; set; } = string.Empty;

    public string About { get; set; } = string.Empty;

    public JobApplicationStatus Status { get; set; } = JobApplicationStatus.New;

    public DateTime CreatedAtUtc { get; set; }

    public DateTime UpdatedAtUtc { get; set; }
}
