# CleanPro Hiring Telegram Bot

Окремий бот тільки для заявок на вакансію прибиральниці.

## Налаштування

1. Створіть нового бота через [@BotFather](https://t.me/BotFather).
2. Додайте токен у `appsettings.Development.json`:

```json
{
  "HiringTelegramBot": {
    "BotToken": "YOUR_HIRING_BOT_TOKEN"
  }
}
```

3. Переконайтесь, що `ConnectionStrings:DefaultConnection` вказує на ту саму SQLite БД, що й API.
4. Запустіть бота й напишіть `/start`.
5. Поділіться номером через кнопку. Якщо номер належить користувачу з роллю `Admin`, бот прив'яже Telegram chat id і надсилатиме сюди нові заявки.

## Запуск

```bash
cd telegram-bot/CleanPro.HiringTelegramBot
dotnet run
```

Після запуску API + бота нові заявки з `/vacancies` надходитимуть у Telegram усім прив'язаним адміністраторам і з'являтимуться в адмінці: `/admin?tab=vacancies`.
