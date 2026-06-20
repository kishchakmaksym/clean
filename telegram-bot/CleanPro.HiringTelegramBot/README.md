# CleanPro Hiring Telegram Bot

Окремий бот **тільки для заявок на вакансію прибиральниці** (не плутати з ботами підтримки та замовлень).

## Налаштування

1. Створіть нового бота через [@BotFather](https://t.me/BotFather).
2. Додайте токен у `appsettings.Development.json`:

```json
{
  "HiringTelegramBot": {
    "BotToken": "YOUR_HIRING_BOT_TOKEN",
    "NotifyChatIds": "123456789"
  }
}
```

3. Щоб дізнатися chat id: напишіть боту `/start` — він відповість вашим id.
4. Переконайтесь, що `ConnectionStrings:DefaultConnection` вказує на ту саму SQLite БД, що й API.

## Запуск

```bash
cd telegram-bot/CleanPro.HiringTelegramBot
dotnet run
```

Після запуску API + бота нові заявки з `/vacancies` надходитимуть у Telegram і з'являтимуться в адмінці: `/admin?tab=vacancies`.
