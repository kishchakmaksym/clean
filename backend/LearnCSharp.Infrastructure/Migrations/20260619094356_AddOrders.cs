using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LearnCSharp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Orders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    ServiceId = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    ServiceTitle = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    OrderType = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    AreaSqm = table.Column<int>(type: "INTEGER", nullable: true),
                    Rooms = table.Column<int>(type: "INTEGER", nullable: true),
                    Bathrooms = table.Column<int>(type: "INTEGER", nullable: true),
                    SelectedAddonsJson = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    TimeSlot = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    TimeSlotLabel = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    PaymentMethod = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    TotalAmount = table.Column<int>(type: "INTEGER", nullable: false),
                    PayableAmount = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Orders_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_UserId",
                table: "Orders",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Orders");
        }
    }
}
