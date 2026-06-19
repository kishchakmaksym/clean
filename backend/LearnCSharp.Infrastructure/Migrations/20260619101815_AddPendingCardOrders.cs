using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LearnCSharp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPendingCardOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PendingCardOrders",
                columns: table => new
                {
                    InvoiceId = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    OrderPayloadJson = table.Column<string>(type: "TEXT", maxLength: 8000, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PendingCardOrders", x => x.InvoiceId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PendingCardOrders");
        }
    }
}
