using LearnCSharp.Application.DTOs.Profile;
using LearnCSharp.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LearnCSharp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ProfileController(IProfileService profileService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ProfileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProfileResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProfileResponseDto>> GetProfile(
        [FromQuery] Guid userId,
        CancellationToken cancellationToken)
    {
        var result = await profileService.GetProfileAsync(userId, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut]
    [ProducesResponseType(typeof(ProfileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProfileResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProfileResponseDto>> UpdateProfile(
        [FromBody] UpdateProfileRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await profileService.UpdateProfileAsync(request, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("addresses")]
    [ProducesResponseType(typeof(ProfileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProfileResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProfileResponseDto>> AddAddress(
        [FromBody] SaveUserAddressRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await profileService.AddAddressAsync(request, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut("addresses")]
    [ProducesResponseType(typeof(ProfileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProfileResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProfileResponseDto>> UpdateAddress(
        [FromBody] UpdateUserAddressRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await profileService.UpdateAddressAsync(request, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpDelete("addresses")]
    [ProducesResponseType(typeof(ProfileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProfileResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProfileResponseDto>> DeleteAddress(
        [FromBody] DeleteUserAddressRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await profileService.DeleteAddressAsync(request, cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
