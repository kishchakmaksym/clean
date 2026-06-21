using CleanPro.TelegramBot.Options;
using CleanPro.TelegramBot.Services;
using CleanPro.TelegramBot.State;
using LearnCSharp.Application;
using LearnCSharp.Infrastructure;
using Microsoft.Extensions.Options;
using Telegram.Bot;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.Configure<TelegramBotOptions>(builder.Configuration.GetSection(TelegramBotOptions.SectionName));
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddSingleton<UserSessionStore>();
builder.Services.AddSingleton<BotScreenMessenger>();
builder.Services.AddSingleton<BotUpdateHandler>();

builder.Services.AddSingleton<ITelegramBotClient>(sp =>
{
    var token = sp.GetRequiredService<IOptions<TelegramBotOptions>>().Value.BotToken;
    return new TelegramBotClient(token);
});

builder.Services.AddHostedService<TelegramPollingService>();
builder.Services.AddHostedService<TelegramOutboxWorker>();

var host = builder.Build();
await host.Services.InitializeDatabaseAsync(applyMigrations: false);
await host.RunAsync();
