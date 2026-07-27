using System.Security.Claims;
using ChessTise.Core.DTOs;
using ChessTise.Core.Models;
using ChessTise.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChessTise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProgressController(AppDbContext db) : ControllerBase
{
    private Guid UserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SessionResponse>>> GetSessions()
    {
        var sessions = await db.Sessions
            .Where(s => s.UserId == UserId)
            .OrderByDescending(s => s.StartedAt)
            .ToListAsync();

        return Ok(sessions.Select(ToResponse));
    }

    [HttpPost]
    public async Task<ActionResult<SessionResponse>> SaveSession(UpsertSessionRequest req)
    {
        var session = new ExerciseSession
        {
            UserId       = UserId,
            ExerciseType = req.ExerciseType,
            Shown        = req.Shown,
            Correct      = req.Correct,
            StartedAt    = req.StartedAt,
            EndedAt      = req.EndedAt,
            HintEnabled  = req.HintEnabled,
            Perspective  = req.Perspective,
        };

        db.Sessions.Add(session);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSessions), ToResponse(session));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<object>> Summary()
    {
        var rows = await db.Sessions
            .Where(s => s.UserId == UserId)
            .GroupBy(s => s.ExerciseType)
            .Select(g => new
            {
                ExerciseType  = g.Key.ToString(),
                TotalShown    = g.Sum(s => s.Shown),
                TotalCorrect  = g.Sum(s => s.Correct),
                Sessions      = g.Count(),
            })
            .ToListAsync();

        return Ok(rows);
    }

    private static SessionResponse ToResponse(ExerciseSession s) =>
        new(s.Id, s.ExerciseType, s.Shown, s.Correct, s.AccuracyPercent,
            s.StartedAt, s.EndedAt, s.HintEnabled, s.Perspective);
}
