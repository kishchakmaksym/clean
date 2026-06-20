using CleanPro.SupportTelegramBot.Options;
using CleanPro.SupportTelegramBot.Services;
using CleanPro.SupportTelegramBot.State;
using LearnCSharp.Application;
using LearnCSharp.Infrastructure;
using Microsoft.Extensions.Options;
using Telegram.Bot;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.Configure<SupportTelegramBotOptions>(
    builder.Configuration.GetSection(SupportTelegramBotOptions.SectionName));
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddSingleton<SupportSessionStore>();
builder.Services.AddSingleton<SupportBotHandler>();

builder.Services.AddSingleton<ITelegramBotClient>(sp =>
{
    var token = sp.GetRequiredService<IOptions<SupportTelegramBotOptions>>().Value.BotToken;
    return new TelegramBotClient(token);
});

builder.Services.AddHostedService<SupportPollingService>();
builder.Services.AddHostedService<SupportOutboxWorker>();

var host = builder.Build();
await host.Services.InitializeDatabaseAsync();
await host.RunAsync();
