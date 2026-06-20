using LearnCSharp.Application.DTOs.JobApplications;
using LearnCSharp.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LearnCSharp.Api.Controllers;

[ApiController]
[Route("api/job-applications")]
public sealed class JobApplicationsController(IJobApplicationService jobApplicationService) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(SubmitJobApplicationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(SubmitJobApplicationResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SubmitJobApplicationResponseDto>> Submit(
        [FromBody] SubmitJobApplicationRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await jobApplicationService.SubmitAsync(request, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("admin")]
    [ProducesResponseType(typeof(AdminJobApplicationsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AdminJobApplicationsResponseDto>> GetForAdmin(
        [FromQuery] Guid userId,
        CancellationToken cancellationToken)
    {
        var result = await jobApplicationService.GetForAdminAsync(userId, cancellationToken);
        return result is null ? Forbid() : Ok(result);
    }

    [HttpPatch("admin/status")]
    [ProducesResponseType(typeof(UpdateJobApplicationStatusResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(UpdateJobApplicationStatusResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<UpdateJobApplicationStatusResponseDto>> UpdateStatus(
        [FromBody] UpdateJobApplicationStatusRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await jobApplicationService.UpdateStatusAsync(request, cancellationToken);
        if (result.Errors?.Contains("Немає доступу.") == true)
        {
            return Forbid();
        }

        return result.Success ? Ok(result) : BadRequest(result);
    }
}
