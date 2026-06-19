using LearnCSharp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LearnCSharp.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Review> Reviews => Set<Review>();

    public DbSet<Order> Orders => Set<Order>();

    public DbSet<PendingCardOrder> PendingCardOrders => Set<PendingCardOrder>();

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

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(order => order.Id);

            entity.Property(order => order.ServiceId)
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(order => order.ServiceTitle)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(order => order.OrderType)
                .HasMaxLength(16)
                .IsRequired();

            entity.Property(order => order.SelectedAddonsJson)
                .HasMaxLength(4000);

            entity.Property(order => order.TimeSlot)
                .HasMaxLength(32)
                .IsRequired();

            entity.Property(order => order.TimeSlotLabel)
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(order => order.Notes)
                .HasMaxLength(2000);

            entity.Property(order => order.PaymentMethod)
                .HasMaxLength(16)
                .IsRequired();

            entity.Property(order => order.Status)
                .IsRequired();

            entity.Property(order => order.CreatedAtUtc)
                .IsRequired();

            entity.HasOne(order => order.User)
                .WithMany()
                .HasForeignKey(order => order.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PendingCardOrder>(entity =>
        {
            entity.HasKey(pending => pending.InvoiceId);

            entity.Property(pending => pending.InvoiceId)
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(pending => pending.OrderPayloadJson)
                .HasMaxLength(8000)
                .IsRequired();

            entity.Property(pending => pending.CreatedAtUtc)
                .IsRequired();
        });
    }
}
