using System.Text.Json;
using LearnCSharp.Application.DTOs.Support;
using LearnCSharp.Application.Interfaces;
using LearnCSharp.Application.Validation;
using LearnCSharp.Domain.Entities;
using LearnCSharp.Domain.Enums;

namespace LearnCSharp.Application.Services;

public sealed class SupportTicketService(
    ISupportTicketRepository supportRepository,
    IUserRepository userRepository) : ISupportTicketService
{
    private const int MaxMessageLength = 4000;
    private static readonly TimeSpan TypingTtl = TimeSpan.FromSeconds(5);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task<SupportTicketsResponseDto> GetTicketsForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var user = await RequireClientUserAsync(userId, cancellationToken);
        if (user is null)
        {
            return EmptyTicketsResponse(userId);
        }

        var tickets = await supportRepository.GetByUserIdAsync(userId, cancellationToken);
        return new SupportTicketsResponseDto
        {
            UserDisplayId = FormatUserDisplayId(userId),
            Tickets = await MapTicketsAsync(tickets, forStaff: false, cancellationToken),
        };
    }

    public async Task<SupportMessagesResponseDto?> GetTicketThreadAsync(
        Guid userId,
        Guid ticketId,
        DateTime? sinceUtc,
        CancellationToken cancellationToken = default)
    {
        var user = await RequireClientUserAsync(userId, cancellationToken);
        if (user is null)
        {
            return null;
        }

        var ticket = await supportRepository.FindByIdAsync(ticketId, cancellationToken);
        if (ticket is null || ticket.UserId != userId)
        {
            return null;
        }

        var messages = await supportRepository.GetMessagesAsync(ticketId, sinceUtc, cancellationToken);
        var mappedTicket = (await MapTicketsAsync([ticket], forStaff: false, cancellationToken)).First();

        return new SupportMessagesResponseDto
        {
            Ticket = mappedTicket,
            Messages = messages.Select(MapMessage).ToList(),
            OtherPartyTyping = IsStaffTyping(ticket),
        };
    }

    public async Task<SupportActionResponseDto> CreateTicketAsync(
        CreateSupportTicketRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var user = await RequireClientUserAsync(request.UserId, cancellationToken);
        if (user is null)
        {
            return Failure(["Увійдіть або зареєструйтесь, щоб написати в підтримку."]);
        }

        if (!request.FaqChecked)
        {
            return Failure(["Підтвердіть, що ви переглянули FAQ перед зверненням."]);
        }

        var body = request.Body.Trim();
        if (string.IsNullOrWhiteSpace(body))
        {
            return Failure(["Напишіть повідомлення для підтримки."]);
        }

        if (body.Length > MaxMessageLength)
        {
            return Failure([$"Повідомлення занадто довге (макс. {MaxMessageLength} символів)."]);
        }

        var now = DateTime.UtcNow;
        var ticket = new SupportTicket
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Status = SupportTicketStatus.Open,
            Subject = TruncateSubject(body),
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
        };

        var systemMessage = new SupportMessage
        {
            Id = Guid.NewGuid(),
            TicketId = ticket.Id,
            SenderType = SupportMessageSenderType.System,
            Body =
                $"Вітаємо в підтримці Smart Clean! Ваш ID: {FormatUserDisplayId(user.Id)}. " +
                "Ми відповімо якомога швидше.",
            CreatedAtUtc = now,
        };

        var userMessage = new SupportMessage
        {
            Id = Guid.NewGuid(),
            TicketId = ticket.Id,
            SenderType = SupportMessageSenderType.User,
            SenderUserId = user.Id,
            Body = body,
            CreatedAtUtc = now.AddMilliseconds(1),
        };

        await supportRepository.AddTicketAsync(ticket, cancellationToken);
        await supportRepository.AddMessageAsync(systemMessage, cancellationToken);
        await supportRepository.AddMessageAsync(userMessage, cancellationToken);

        await EnqueueAdminNotificationAsync(
            SupportOutboxType.NotifyAdminsNewTicket,
            new { ticketId = ticket.Id, messageId = userMessage.Id },
            cancellationToken);

        ticket.User = user;
        var mapped = (await MapTicketsAsync([ticket], forStaff: false, cancellationToken)).First();

        return new SupportActionResponseDto
        {
            Success = true,
            Message = "Звернення створено.",
            Ticket = mapped,
            SentMessage = MapMessage(userMessage),
        };
    }

    public async Task<SupportActionResponseDto> SendUserMessageAsync(
        SendSupportMessageRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var user = await RequireClientUserAsync(request.UserId, cancellationToken);
        if (user is null)
        {
            return Failure(["Увійдіть або зареєструйтесь, щоб написати в підтримку."]);
        }

        var ticket = await supportRepository.FindByIdAsync(request.TicketId, cancellationToken);
        if (ticket is null || ticket.UserId != request.UserId)
        {
            return Failure(["Звернення не знайдено."]);
        }

        if (ticket.Status == SupportTicketStatus.Closed)
        {
            return Failure(["Це звернення закрито. Створіть нове."]);
        }

        var body = request.Body.Trim();
        if (string.IsNullOrWhiteSpace(body))
        {
            return Failure(["Напишіть повідомлення."]);
        }

        if (body.Length > MaxMessageLength)
        {
            return Failure([$"Повідомлення занадто довге (макс. {MaxMessageLength} символів)."]);
        }

        var message = await AddUserMessageInternalAsync(ticket, user, body, cancellationToken);

        await EnqueueAdminNotificationAsync(
            SupportOutboxType.NotifyAdminsUserMessage,
            new { ticketId = ticket.Id, messageId = message.Id },
            cancellationToken);

        ticket.User = user;
        var mappedTicket = (await MapTicketsAsync([ticket], forStaff: false, cancellationToken)).First();

        return new SupportActionResponseDto
        {
            Success = true,
            Message = "Повідомлення надіслано.",
            Ticket = mappedTicket,
            SentMessage = MapMessage(message),
        };
    }

    public async Task<SupportTicketsResponseDto> GetTicketsForAdminAsync(
        Guid adminUserId,
        CancellationToken cancellationToken = default)
    {
        if (!await IsAdminAsync(adminUserId, cancellationToken))
        {
            return EmptyTicketsResponse(adminUserId);
        }

        var tickets = await supportRepository.GetAllForAdminAsync(cancellationToken);
        return new SupportTicketsResponseDto
        {
            UserDisplayId = FormatUserDisplayId(adminUserId),
            Tickets = await MapTicketsAsync(tickets, forStaff: true, cancellationToken),
        };
    }

    public async Task<SupportMessagesResponseDto?> GetTicketThreadForAdminAsync(
        Guid adminUserId,
        Guid ticketId,
        DateTime? sinceUtc,
        CancellationToken cancellationToken = default)
    {
        if (!await IsAdminAsync(adminUserId, cancellationToken))
        {
            return null;
        }

        var ticket = await supportRepository.FindByIdAsync(ticketId, cancellationToken);
        if (ticket is null)
        {
            return null;
        }

        var messages = await supportRepository.GetMessagesAsync(ticketId, sinceUtc, cancellationToken);
        var mappedTicket = (await MapTicketsAsync([ticket], forStaff: true, cancellationToken)).First();

        return new SupportMessagesResponseDto
        {
            Ticket = mappedTicket,
            Messages = messages.Select(MapMessage).ToList(),
            OtherPartyTyping = IsUserTyping(ticket),
        };
    }

    public async Task<SupportActionResponseDto> SendStaffMessageAsync(
        AdminSupportMessageRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (!await IsAdminAsync(request.UserId, cancellationToken))
        {
            return Failure(["Недостатньо прав."]);
        }

        return await SendStaffMessageFromTelegramAsync(
            request.UserId,
            request.TicketId,
            request.Body,
            cancellationToken);
    }

    public async Task<SupportActionResponseDto> CloseTicketAsync(
        Guid adminUserId,
        Guid ticketId,
        CancellationToken cancellationToken = default)
    {
        if (!await IsAdminAsync(adminUserId, cancellationToken))
        {
            return Failure(["Недостатньо прав."]);
        }

        var ticket = await supportRepository.FindByIdAsync(ticketId, cancellationToken);
        if (ticket is null)
        {
            return Failure(["Звернення не знайдено."]);
        }

        if (ticket.Status == SupportTicketStatus.Closed)
        {
            return Failure(["Звернення вже закрито."]);
        }

        var now = DateTime.UtcNow;
        ticket.Status = SupportTicketStatus.Closed;
        ticket.ClosedAtUtc = now;
        ticket.UpdatedAtUtc = now;
        await supportRepository.UpdateTicketAsync(ticket, cancellationToken);

        var systemMessage = new SupportMessage
        {
            Id = Guid.NewGuid(),
            TicketId = ticket.Id,
            SenderType = SupportMessageSenderType.System,
            Body = "Звернення закрито. Якщо потрібна допомога — створіть нове.",
            CreatedAtUtc = now,
        };
        await supportRepository.AddMessageAsync(systemMessage, cancellationToken);

        var mapped = (await MapTicketsAsync([ticket], forStaff: true, cancellationToken)).First();
        return new SupportActionResponseDto
        {
            Success = true,
            Message = "Звернення закрито.",
            Ticket = mapped,
        };
    }

    public async Task<SupportActionResponseDto> SendStaffMessageFromTelegramAsync(
        Guid adminUserId,
        Guid ticketId,
        string body,
        CancellationToken cancellationToken = default)
    {
        var admin = await userRepository.FindByIdAsync(adminUserId, cancellationToken);
        if (admin is null || admin.Role != UserRole.Admin)
        {
            return Failure(["Недостатньо прав."]);
        }

        var ticket = await supportRepository.FindByIdAsync(ticketId, cancellationToken);
        if (ticket is null)
        {
            return Failure(["Звернення не знайдено."]);
        }

        if (ticket.Status == SupportTicketStatus.Closed)
        {
            return Failure(["Звернення закрито."]);
        }

        var trimmed = body.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return Failure(["Напишіть повідомлення."]);
        }

        if (trimmed.Length > MaxMessageLength)
        {
            return Failure([$"Повідомлення занадто довге (макс. {MaxMessageLength} символів)."]);
        }

        var now = DateTime.UtcNow;
        var message = new SupportMessage
        {
            Id = Guid.NewGuid(),
            TicketId = ticket.Id,
            SenderType = SupportMessageSenderType.Staff,
            SenderUserId = admin.Id,
            Body = trimmed,
            CreatedAtUtc = now,
        };

        ticket.Status = SupportTicketStatus.Answered;
        ticket.UpdatedAtUtc = now;
        ticket.StaffTypingUntilUtc = null;
        await supportRepository.UpdateTicketAsync(ticket, cancellationToken);
        await supportRepository.AddMessageAsync(message, cancellationToken);

        ticket.User = ticket.User ?? await userRepository.FindByIdAsync(ticket.UserId, cancellationToken);
        var mappedTicket = (await MapTicketsAsync([ticket], forStaff: true, cancellationToken)).First();

        return new SupportActionResponseDto
        {
            Success = true,
            Message = "Відповідь надіслано.",
            Ticket = mappedTicket,
            SentMessage = MapMessage(message),
        };
    }

    public async Task<SupportTelegramLinkResultDto> LinkTelegramAdminAsync(
        long telegramUserId,
        long chatId,
        string contactPhone,
        CancellationToken cancellationToken = default)
    {
        if (!AuthValidator.TryNormalizePhone(contactPhone, out var normalizedPhone))
        {
            return new SupportTelegramLinkResultDto
            {
                Success = false,
                Message = "Не вдалося прочитати номер телефону з Telegram.",
            };
        }

        var user = await userRepository.FindByPhoneAsync(normalizedPhone, cancellationToken);
        if (user is null)
        {
            return new SupportTelegramLinkResultDto
            {
                Success = false,
                Message = "Цей номер не знайдено в системі CleanPro.",
            };
        }

        if (user.Role != UserRole.Admin)
        {
            return new SupportTelegramLinkResultDto
            {
                Success = false,
                Message = "Бот підтримки доступний лише адміністраторам.",
            };
        }

        await supportRepository.UpsertSupportTelegramAccountAsync(
            new SupportTelegramAccount
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TelegramUserId = telegramUserId,
                ChatId = chatId,
                VerifiedPhone = normalizedPhone,
                LinkedAtUtc = DateTime.UtcNow,
                LastSeenAtUtc = DateTime.UtcNow,
            },
            cancellationToken);

        return new SupportTelegramLinkResultDto
        {
            Success = true,
            Message = $"✅ Вітаємо, {user.Name}! Ви підключили бот підтримки Smart Clean.",
            AdminUserId = user.Id,
        };
    }

    public async Task SetUserTypingAsync(
        Guid userId,
        Guid ticketId,
        CancellationToken cancellationToken = default)
    {
        var user = await RequireClientUserAsync(userId, cancellationToken);
        if (user is null)
        {
            return;
        }

        var ticket = await supportRepository.FindByIdAsync(ticketId, cancellationToken);
        if (ticket is null || ticket.UserId != userId || ticket.Status == SupportTicketStatus.Closed)
        {
            return;
        }

        ticket.UserTypingUntilUtc = DateTime.UtcNow.Add(TypingTtl);
        await supportRepository.UpdateTicketAsync(ticket, cancellationToken);
    }

    public async Task SetStaffTypingAsync(
        Guid adminUserId,
        Guid ticketId,
        CancellationToken cancellationToken = default)
    {
        if (!await IsAdminAsync(adminUserId, cancellationToken))
        {
            return;
        }

        var ticket = await supportRepository.FindByIdAsync(ticketId, cancellationToken);
        if (ticket is null || ticket.Status == SupportTicketStatus.Closed)
        {
            return;
        }

        ticket.StaffTypingUntilUtc = DateTime.UtcNow.Add(TypingTtl);
        await supportRepository.UpdateTicketAsync(ticket, cancellationToken);
    }

    private async Task<SupportMessage> AddUserMessageInternalAsync(
        SupportTicket ticket,
        User user,
        string body,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var message = new SupportMessage
        {
            Id = Guid.NewGuid(),
            TicketId = ticket.Id,
            SenderType = SupportMessageSenderType.User,
            SenderUserId = user.Id,
            Body = body,
            CreatedAtUtc = now,
        };

        ticket.Status = SupportTicketStatus.Open;
        ticket.UpdatedAtUtc = now;
        ticket.UserTypingUntilUtc = null;
        await supportRepository.UpdateTicketAsync(ticket, cancellationToken);
        await supportRepository.AddMessageAsync(message, cancellationToken);
        return message;
    }

    private async Task EnqueueAdminNotificationAsync(
        SupportOutboxType type,
        object payload,
        CancellationToken cancellationToken)
    {
        await supportRepository.EnqueueOutboxAsync(
            new SupportOutboxMessage
            {
                Id = Guid.NewGuid(),
                Type = type,
                PayloadJson = JsonSerializer.Serialize(payload, JsonOptions),
                CreatedAtUtc = DateTime.UtcNow,
            },
            cancellationToken);
    }

    private async Task<User?> RequireClientUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByIdAsync(userId, cancellationToken);
        if (user is null || user.Role is UserRole.Admin or UserRole.Employee)
        {
            return null;
        }

        return user;
    }

    private async Task<bool> IsAdminAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByIdAsync(userId, cancellationToken);
        return user?.Role == UserRole.Admin;
    }

    private async Task<IReadOnlyList<SupportTicketDto>> MapTicketsAsync(
        IReadOnlyList<SupportTicket> tickets,
        bool forStaff,
        CancellationToken cancellationToken)
    {
        var result = new List<SupportTicketDto>(tickets.Count);

        foreach (var ticket in tickets)
        {
            var messages = await supportRepository.GetMessagesAsync(ticket.Id, null, cancellationToken);
            var lastMessage = messages.LastOrDefault();
            var preview = lastMessage?.Body ?? "Без повідомлень";
            if (preview.Length > 120)
            {
                preview = preview[..117] + "…";
            }

            var lastStaffAt = messages
                .Where(message => message.SenderType == SupportMessageSenderType.Staff)
                .Select(message => message.CreatedAtUtc)
                .DefaultIfEmpty(DateTime.MinValue)
                .Max();
            var unreadForStaff = messages.Count(message =>
                message.SenderType == SupportMessageSenderType.User && message.CreatedAtUtc > lastStaffAt);

            var lastUserAt = messages
                .Where(message => message.SenderType == SupportMessageSenderType.User)
                .Select(message => message.CreatedAtUtc)
                .DefaultIfEmpty(DateTime.MinValue)
                .Max();
            var unreadForUser = messages.Count(message =>
                message.SenderType == SupportMessageSenderType.Staff && message.CreatedAtUtc > lastUserAt);

            var customerName = ticket.User?.Name ?? "Клієнт";
            var customerPhone = ticket.User?.Phone ?? "—";

            result.Add(new SupportTicketDto
            {
                Id = ticket.Id,
                UserId = ticket.UserId,
                UserDisplayId = FormatUserDisplayId(ticket.UserId),
                CustomerName = customerName,
                CustomerPhone = customerPhone,
                Status = ticket.Status.ToString(),
                Subject = ticket.Subject,
                Preview = preview,
                CreatedAtUtc = ticket.CreatedAtUtc,
                UpdatedAtUtc = ticket.UpdatedAtUtc,
                UnreadForUser = forStaff ? 0 : unreadForUser,
                UnreadForStaff = forStaff ? unreadForStaff : 0,
            });
        }

        return result;
    }

    private static bool IsStaffTyping(SupportTicket ticket) =>
        ticket.StaffTypingUntilUtc is not null && ticket.StaffTypingUntilUtc > DateTime.UtcNow;

    private static bool IsUserTyping(SupportTicket ticket) =>
        ticket.UserTypingUntilUtc is not null && ticket.UserTypingUntilUtc > DateTime.UtcNow;

    private static SupportMessageDto MapMessage(SupportMessage message) =>
        new()
        {
            Id = message.Id,
            TicketId = message.TicketId,
            SenderType = message.SenderType.ToString(),
            SenderName = message.SenderType switch
            {
                SupportMessageSenderType.System => "Підтримка",
                SupportMessageSenderType.Staff => message.SenderUser?.Name ?? "Оператор",
                _ => message.SenderUser?.Name ?? "Ви",
            },
            Body = message.Body,
            CreatedAtUtc = message.CreatedAtUtc,
        };

    private static string FormatUserDisplayId(Guid userId) =>
        userId.ToString()[..8].ToUpperInvariant();

    private static string TruncateSubject(string body)
    {
        var line = body.Split('\n', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.Trim() ?? body.Trim();
        return line.Length <= 80 ? line : line[..77] + "…";
    }

    private static SupportTicketsResponseDto EmptyTicketsResponse(Guid userId) =>
        new()
        {
            UserDisplayId = FormatUserDisplayId(userId),
            Tickets = [],
        };

    private static SupportActionResponseDto Failure(IReadOnlyList<string> errors) =>
        new() { Success = false, Errors = errors };
}
