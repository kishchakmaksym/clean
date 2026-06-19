namespace LearnCSharp.Application.Interfaces;

public interface IStreetSearchService
{
    Task<IReadOnlyList<string>> SearchStreetsAsync(
        string settlementId,
        string query,
        CancellationToken cancellationToken = default);

    Task<(bool Success, string? Error)> ValidateAddressLineAsync(
        string addressLine,
        CancellationToken cancellationToken = default);
}
