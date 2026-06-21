using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LearnCSharp.Infrastructure.Postgres.Migrations;

/// <inheritdoc />
public partial class AddTelegramLastBotScreenMessageId : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "LastBotScreenMessageId",
            table: "TelegramAccounts",
            type: "integer",
            nullable: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "LastBotScreenMessageId",
            table: "TelegramAccounts");
    }
}
