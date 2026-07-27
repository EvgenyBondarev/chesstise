namespace ChessTise.Core.Models;

public enum ExerciseType
{
    CellGuesser,
    SquareColor,
    BlindPathing
}

public class ExerciseSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public ExerciseType ExerciseType { get; set; }
    public int Shown { get; set; }
    public int Correct { get; set; }
    public int AccuracyPercent => Shown == 0 ? 0 : (int)Math.Round(Correct * 100.0 / Shown);

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndedAt { get; set; }

    public bool? HintEnabled { get; set; }
    public string? Perspective { get; set; }
}
