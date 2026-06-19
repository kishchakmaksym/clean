using LearnCSharp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LearnCSharp.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Review> Reviews => Set<Review>();

    public DbSet<Order> Orders => Set<Order>();

    public DbSet<PendingCardOrder> PendingCardOrders => Set<PendingCardOrder>();

    public DbSet<UserAddress> UserAddresses => Set<UserAddress>();

    public DbSet<TelegramAccount> TelegramAccounts => Set<TelegramAccount>();

    public DbSet<EmployeeProfile> EmployeeProfiles => Set<EmployeeProfile>();

    public DbSet<OrderAssignment> OrderAssignments => Set<OrderAssignment>();

    public DbSet<StaffAuditLog> StaffAuditLogs => Set<StaffAuditLog>();

    public DbSet<TelegramOutboxMessage> TelegramOutboxMessages => Set<TelegramOutboxMessage>();

    public DbSet<TelegramOrderNotification> TelegramOrderNotifications => Set<TelegramOrderNotification>();

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

            entity.HasMany(user => user.Addresses)
                .WithOne(address => address.User)
                .HasForeignKey(address => address.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserAddress>(entity =>
        {
            entity.HasKey(address => address.Id);

            entity.Property(address => address.Label)
                .HasMaxLength(64);

            entity.Property(address => address.AddressLine)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(address => address.CreatedAtUtc)
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

            entity.Property(order => order.Address)
                .HasMaxLength(500);

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

            entity.HasOne(order => order.UserAddress)
                .WithMany()
                .HasForeignKey(order => order.UserAddressId)
                .OnDelete(DeleteBehavior.SetNull);
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

        modelBuilder.Entity<TelegramAccount>(entity =>
        {
            entity.HasKey(account => account.Id);

            entity.HasIndex(account => account.TelegramUserId)
                .IsUnique();

            entity.HasIndex(account => account.UserId)
                .IsUnique();

            entity.Property(account => account.VerifiedPhone)
                .HasMaxLength(20)
                .IsRequired();

            entity.HasOne(account => account.User)
                .WithMany()
                .HasForeignKey(account => account.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EmployeeProfile>(entity =>
        {
            entity.HasKey(profile => profile.UserId);

            entity.Property(profile => profile.SharePercent)
                .HasPrecision(5, 2);

            entity.HasOne(profile => profile.User)
                .WithMany()
                .HasForeignKey(profile => profile.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OrderAssignment>(entity =>
        {
            entity.HasKey(assignment => assignment.OrderId);

            entity.HasOne(assignment => assignment.Order)
                .WithMany()
                .HasForeignKey(assignment => assignment.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(assignment => assignment.Employee)
                .WithMany()
                .HasForeignKey(assignment => assignment.EmployeeUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<StaffAuditLog>(entity =>
        {
            entity.HasKey(log => log.Id);

            entity.Property(log => log.Details)
                .HasMaxLength(2000)
                .IsRequired();

            entity.HasOne(log => log.Actor)
                .WithMany()
                .HasForeignKey(log => log.ActorUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(log => log.Order)
                .WithMany()
                .HasForeignKey(log => log.OrderId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TelegramOutboxMessage>(entity =>
        {
            entity.HasKey(message => message.Id);

            entity.Property(message => message.PayloadJson)
                .HasMaxLength(8000)
                .IsRequired();
        });

        modelBuilder.Entity<TelegramOrderNotification>(entity =>
        {
            entity.HasKey(notification => notification.Id);

            entity.HasIndex(notification => new { notification.OrderId, notification.ChatId, notification.MessageId })
                .IsUnique();

            entity.HasOne(notification => notification.Order)
                .WithMany()
                .HasForeignKey(notification => notification.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
