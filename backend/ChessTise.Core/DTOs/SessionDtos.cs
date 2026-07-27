using ChessTise.Core.Models;

namespace ChessTise.Core.DTOs;

public record UpsertSessionRequest(
    ExerciseType ExerciseType,
    int Shown,
    int Correct,
    DateTime StartedAt,
    DateTime? EndedAt,
    bool? HintEnabled,
    string? Perspective
);

public record SessionResponse(
    Guid Id,
    ExerciseType ExerciseType,
    int Shown,
    int Correct,
    int AccuracyPercent,
    DateTime StartedAt,
    DateTime? EndedAt,
    bool? HintEnabled,
    string? Perspective
);

public record RegisterRequest(string Email, string DisplayName, string Password);
public record LoginRequest(string Email, string Password);
public record GoogleSignInRequest(string IdToken);
public record AuthResponse(string Token, string DisplayName);
