# CleanPro Support Telegram Bot

Окремий бот **тільки для підтримки** (не плутати з ботом для працівників/замовлень).

## Налаштування

1. Створіть нового бота через [@BotFather](https://t.me/BotFather).
2. Скопіюйте токен у `appsettings.Development.json`:

```json
{
  "SupportTelegramBot": {
    "BotToken": "YOUR_SUPPORT_BOT_TOKEN"
  }
}
```

3. Переконайтесь, що `ConnectionStrings:DefaultConnection` вказує на ту саму SQLite БД, що й API.

## Запуск

```bash
cd telegram-bot/CleanPro.SupportTelegramBot
dotnet run
```

## Як увійти

1. Надішліть `/start` боту.
2. Натисніть «Надіслати номер телефону» — має збігатися з номером **адміністратора** у CleanPro.
3. Після входу з’явиться меню «Звернення».

## Що вміє бот

- Сповіщення про нові звернення та повідомлення клієнтів
- Перегляд списку відкритих тікетів
- Відповідь клієнту (текстом після вибору тікета)
- Закриття звернення

Відповіді також доступні в адмін-панелі сайту: `/admin?tab=support`.
