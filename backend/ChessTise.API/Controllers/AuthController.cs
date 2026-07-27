using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ChessTise.Core.DTOs;
using ChessTise.Core.Models;
using ChessTise.Infrastructure.Data;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace ChessTise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext db, IConfiguration config) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email))
            return Conflict("Email already registered.");

        var user = new User
        {
            Email        = req.Email.Trim().ToLowerInvariant(),
            DisplayName  = req.DisplayName.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Ok(new AuthResponse(BuildToken(user), user.DisplayName));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLowerInvariant());

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized("Invalid credentials.");

        return Ok(new AuthResponse(BuildToken(user), user.DisplayName));
    }

    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> GoogleSignIn(GoogleSignInRequest req)
    {
        var clientId = config["Google:ClientId"]!;
        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(req.IdToken,
                new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = [clientId],
                });
        }
        catch
        {
            return Unauthorized("Invalid Google token.");
        }

        var email = payload.Email.Trim().ToLowerInvariant();
        var user  = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null)
        {
            user = new User
            {
                Email        = email,
                DisplayName  = payload.Name ?? email.Split('@')[0],
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        return Ok(new AuthResponse(BuildToken(user), user.DisplayName));
    }

    private string BuildToken(User user)
    {
        var jwtSection = config.GetSection("Jwt");
        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection["Key"]!));
        var expiry = DateTime.UtcNow.AddHours(double.Parse(jwtSection["ExpiryHours"]!));

        var token = new JwtSecurityToken(
            issuer:   jwtSection["Issuer"],
            audience: jwtSection["Audience"],
            claims:   [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                       new Claim(ClaimTypes.Email, user.Email)],
            expires:  expiry,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
