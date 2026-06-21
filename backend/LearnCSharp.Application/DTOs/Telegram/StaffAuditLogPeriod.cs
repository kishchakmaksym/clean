namespace LearnCSharp.Application.DTOs.Telegram;

public enum StaffAuditLogPeriod
{
    Today = 0,
    Yesterday = 1,
    Last7Days = 2,
    LastMonth = 3,
}

public sealed class StaffAuditLogsPageDto
{
    public required string PeriodLabel { get; init; }

    public required IReadOnlyList<StaffAuditLogDto> Items { get; init; }

    public int TotalCount { get; init; }

    public int Page { get; init; }

    public int PageSize { get; init; }

    public int TotalPages =>
        PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);

    public bool HasPreviousPage => Page > 0;

    public bool HasNextPage => Page + 1 < TotalPages;
}
