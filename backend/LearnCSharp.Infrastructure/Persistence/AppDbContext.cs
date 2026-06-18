using LearnCSharp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LearnCSharp.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Review> Reviews => Set<Review>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(user => user.Id);

            entity.Property(user => user.Name)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(user => user.Email)
                .HasMaxLength(256)
                .IsRequired();

            entity.HasIndex(user => user.Email)
                .IsUnique();

            entity.Property(user => user.Phone)
                .HasMaxLength(20)
                .IsRequired();

            entity.HasIndex(user => user.Phone)
                .IsUnique();

            entity.Property(user => user.PasswordHash)
                .HasMaxLength(256)
                .IsRequired();

            entity.Property(user => user.CreatedAtUtc)
                .IsRequired();

            entity.Property(user => user.Role)
                .IsRequired();
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasKey(review => review.Id);

            entity.Property(review => review.AuthorName)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(review => review.Rating)
                .IsRequired();

            entity.Property(review => review.Text)
                .HasMaxLength(2000)
                .IsRequired();

            entity.Property(review => review.CreatedAtUtc)
                .IsRequired();

            entity.HasOne(review => review.User)
                .WithMany()
                .HasForeignKey(review => review.UserId)
                .OnDelete(DeleteBehavior.SetNull)
                .IsRequired(false);
        });
    }
}
