using ChessTise.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace ChessTise.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<ExerciseSession> Sessions => Set<ExerciseSession>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).HasMaxLength(256).IsRequired();
            e.Property(u => u.DisplayName).HasMaxLength(100).IsRequired();
        });

        b.Entity<ExerciseSession>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasOne(s => s.User)
             .WithMany(u => u.Sessions)
             .HasForeignKey(s => s.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.Property(s => s.ExerciseType)
             .HasConversion<string>();
            e.Ignore(s => s.AccuracyPercent);
        });
    }
}
