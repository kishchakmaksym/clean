using CleanPro.HiringTelegramBot.Options;
using CleanPro.HiringTelegramBot.Services;
using LearnCSharp.Application;
using LearnCSharp.Infrastructure;
using Microsoft.Extensions.Options;
using Telegram.Bot;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.Configure<HiringTelegramBotOptions>(
    builder.Configuration.GetSection(HiringTelegramBotOptions.SectionName));
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddSingleton<HiringBotHandler>();

builder.Services.AddSingleton<ITelegramBotClient>(sp =>
{
    var token = sp.GetRequiredService<IOptions<HiringTelegramBotOptions>>().Value.BotToken;
    return new TelegramBotClient(token);
});

builder.Services.AddHostedService<HiringPollingService>();
builder.Services.AddHostedService<HiringOutboxWorker>();

var host = builder.Build();
await host.Services.InitializeDatabaseAsync(applyMigrations: false);
await host.RunAsync();
