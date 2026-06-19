using LearnCSharp.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LearnCSharp.Api.Controllers;

[ApiController]
[Route("api/streets")]
public sealed class StreetsController(IStreetSearchService streetSearchService) : ControllerBase
{
    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string settlement,
        [FromQuery] string q,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(settlement))
        {
            return BadRequest(new { success = false, errors = new[] { "Вкажіть населений пункт." } });
        }

        var streets = await streetSearchService.SearchStreetsAsync(settlement, q ?? string.Empty, cancellationToken);
        return Ok(new { success = true, streets });
    }
}
