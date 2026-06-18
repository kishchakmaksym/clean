using LearnCSharp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LearnCSharp.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

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
        });
    }
}
