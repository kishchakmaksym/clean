export type SupportTicketStatus = "Open" | "Answered" | "Closed";

export type SupportMessageSenderType = "System" | "User" | "Staff";

export type SupportTicketDto = {
    id: string;
    userId: string;
    userDisplayId: string;
    customerName: string;
    customerPhone: string;
    status: SupportTicketStatus;
    subject?: string | null;
    preview: string;
    createdAtUtc: string;
    updatedAtUtc?: string | null;
    unreadForUser: number;
    unreadForStaff: number;
};

export type SupportMessageDto = {
    id: string;
    ticketId: string;
    senderType: SupportMessageSenderType;
    senderName?: string | null;
    body: string;
    createdAtUtc: string;
};

export type SupportTicketsResponse = {
    tickets: SupportTicketDto[];
    userDisplayId: string;
};

export type SupportMessagesResponse = {
    ticket: SupportTicketDto;
    messages: SupportMessageDto[];
    otherPartyTyping: boolean;
};

export type SupportActionResponse = {
    success: boolean;
    message?: string;
    ticket?: SupportTicketDto;
    sentMessage?: SupportMessageDto;
    errors?: string[];
};

export async function fetchUserSupportTickets(userId: string): Promise<SupportTicketsResponse> {
    const response = await fetch(`/api/support/tickets?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) {
        throw new Error("Не вдалося завантажити звернення.");
    }
    return (await response.json()) as SupportTicketsResponse;
}

export async function fetchUserSupportThread(
    userId: string,
    ticketId: string,
    sinceUtc?: string,
): Promise<SupportMessagesResponse> {
    const params = new URLSearchParams({ userId });
    if (sinceUtc) {
        params.set("sinceUtc", sinceUtc);
    }
    const response = await fetch(`/api/support/tickets/${ticketId}?${params.toString()}`);
    if (!response.ok) {
        throw new Error("Не вдалося завантажити чат.");
    }
    return (await response.json()) as SupportMessagesResponse;
}

export async function createSupportTicket(payload: {
    userId: string;
    body: string;
    faqChecked: boolean;
}): Promise<SupportActionResponse> {
    const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = (await response.json()) as SupportActionResponse;
    if (!response.ok && data.success !== false) {
        return { success: false, errors: ["Не вдалося створити звернення."] };
    }
    return data;
}

export async function sendSupportUserMessage(payload: {
    userId: string;
    ticketId: string;
    body: string;
}): Promise<SupportActionResponse> {
    const response = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = (await response.json()) as SupportActionResponse;
    if (!response.ok && data.success !== false) {
        return { success: false, errors: ["Не вдалося надіслати повідомлення."] };
    }
    return data;
}

export async function fetchAdminSupportTickets(userId: string): Promise<SupportTicketsResponse> {
    const response = await fetch(`/api/support/admin/tickets?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) {
        throw new Error("Не вдалося завантажити звернення.");
    }
    return (await response.json()) as SupportTicketsResponse;
}

export async function fetchAdminSupportThread(
    userId: string,
    ticketId: string,
    sinceUtc?: string,
): Promise<SupportMessagesResponse> {
    const params = new URLSearchParams({ userId });
    if (sinceUtc) {
        params.set("sinceUtc", sinceUtc);
    }
    const response = await fetch(`/api/support/admin/tickets/${ticketId}?${params.toString()}`);
    if (!response.ok) {
        throw new Error("Не вдалося завантажити чат.");
    }
    return (await response.json()) as SupportMessagesResponse;
}

export async function sendSupportStaffMessage(payload: {
    userId: string;
    ticketId: string;
    body: string;
}): Promise<SupportActionResponse> {
    const response = await fetch("/api/support/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = (await response.json()) as SupportActionResponse;
    if (!response.ok && data.success !== false) {
        return { success: false, errors: ["Не вдалося надіслати відповідь."] };
    }
    return data;
}

export async function sendSupportStaffTyping(userId: string, ticketId: string): Promise<void> {
    await fetch(
        `/api/support/admin/tickets/${ticketId}/typing?userId=${encodeURIComponent(userId)}`,
        { method: "POST" },
    );
}

export async function sendSupportUserTyping(userId: string, ticketId: string): Promise<void> {
    await fetch(
        `/api/support/tickets/${ticketId}/typing?userId=${encodeURIComponent(userId)}`,
        { method: "POST" },
    );
}

export async function closeSupportTicket(userId: string, ticketId: string): Promise<SupportActionResponse> {
    const response = await fetch(
        `/api/support/admin/tickets/${ticketId}/close?userId=${encodeURIComponent(userId)}`,
        { method: "POST" },
    );
    const data = (await response.json()) as SupportActionResponse;
    if (!response.ok && data.success !== false) {
        return { success: false, errors: ["Не вдалося закрити звернення."] };
    }
    return data;
}

export const supportTicketStatusLabels: Record<SupportTicketStatus, string> = {
    Open: "Відкрито",
    Answered: "Відповіли",
    Closed: "Закрито",
};
