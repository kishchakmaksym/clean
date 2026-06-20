import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import {
    closeSupportTicket,
    fetchAdminSupportThread,
    fetchAdminSupportTickets,
    sendSupportStaffMessage,
    sendSupportStaffTyping,
    supportTicketStatusLabels,
    type SupportMessageDto,
    type SupportTicketDto,
} from "../api/support";
import SupportTypingIndicator from "../components/support/SupportTypingIndicator";
import ModalPortal from "../components/ModalPortal";
import { scrollSupportMessagesToBottom, useSupportTypingPulse } from "../hooks/useSupportChat";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { formatUkrainianDateTime } from "../utils/dateTime";
import "./ReviewsPage.css";

type ProfileAdminSupportTabProps = {
    userId: string;
};

function messageClassName(senderType: SupportMessageDto["senderType"]) {
    if (senderType === "User") {
        return "admin-support-bubble admin-support-bubble--user";
    }
    if (senderType === "Staff") {
        return "admin-support-bubble admin-support-bubble--staff";
    }
    return "admin-support-bubble admin-support-bubble--system";
}

export default function ProfileAdminSupportTab({ userId }: ProfileAdminSupportTabProps) {
    const [tickets, setTickets] = useState<SupportTicketDto[]>([]);
    const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
    const [messages, setMessages] = useState<SupportMessageDto[]>([]);
    const [otherPartyTyping, setOtherPartyTyping] = useState(false);
    const [draft, setDraft] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState("");
    const [pendingCloseTicket, setPendingCloseTicket] = useState(false);
    const messagesRef = useRef<HTMLDivElement>(null);
    const lastMessageAtRef = useRef<string | undefined>(undefined);
    const lastMessageIdRef = useRef<string | undefined>(undefined);

    const loadTickets = useCallback(async () => {
        setIsLoading(true);
        setError("");

        try {
            const data = await fetchAdminSupportTickets(userId);
            setTickets(data.tickets);
        } catch {
            setError("Не вдалося завантажити звернення.");
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    const loadThread = useCallback(
        async (ticketId: string, sinceUtc?: string) => {
            try {
                const data = await fetchAdminSupportThread(userId, ticketId, sinceUtc);
                setOtherPartyTyping(data.otherPartyTyping);
                setMessages((current) =>
                    sinceUtc ? [...current, ...data.messages] : data.messages,
                );
                setTickets((current) =>
                    current.map((ticket) => (ticket.id === data.ticket.id ? data.ticket : ticket)),
                );
            } catch {
                setError("Не вдалося завантажити чат.");
            }
        },
        [userId],
    );

    const sendTypingPulse = useCallback(() => {
        if (!activeTicketId || !draft.trim()) {
            return;
        }

        void sendSupportStaffTyping(userId, activeTicketId);
    }, [activeTicketId, draft, userId]);

    useSupportTypingPulse(Boolean(activeTicketId && draft.trim()), sendTypingPulse);

    useBodyScrollLock(pendingCloseTicket);

    useEffect(() => {
        void loadTickets();
    }, [loadTickets]);

    useEffect(() => {
        if (!activeTicketId) {
            return;
        }

        setMessages([]);
        setOtherPartyTyping(false);
        lastMessageIdRef.current = undefined;
        void loadThread(activeTicketId);

        const intervalId = window.setInterval(() => {
            void loadThread(activeTicketId, lastMessageAtRef.current);
        }, 3000);

        return () => window.clearInterval(intervalId);
    }, [activeTicketId, loadThread]);

    useEffect(() => {
        const lastMessage = messages.at(-1);
        lastMessageAtRef.current = lastMessage?.createdAtUtc;

        const lastId = lastMessage?.id;
        const hasNewMessage = Boolean(lastId && lastId !== lastMessageIdRef.current);
        lastMessageIdRef.current = lastId;

        if (hasNewMessage) {
            scrollSupportMessagesToBottom(messagesRef.current, "smooth");
        } else if (otherPartyTyping) {
            scrollSupportMessagesToBottom(messagesRef.current, "auto");
        }
    }, [messages, otherPartyTyping]);

    const activeTicket = tickets.find((ticket) => ticket.id === activeTicketId) ?? null;

    async function handleSendMessage(event: FormEvent) {
        event.preventDefault();
        if (!activeTicketId) {
            return;
        }

        const body = draft.trim();
        if (!body) {
            return;
        }

        setIsSending(true);
        setError("");

        const result = await sendSupportStaffMessage({
            userId,
            ticketId: activeTicketId,
            body,
        });

        setIsSending(false);

        if (!result.success) {
            setError(result.errors?.[0] ?? "Не вдалося надіслати.");
            return;
        }

        setDraft("");
        setOtherPartyTyping(false);
        if (result.sentMessage) {
            setMessages((current) => [...current, result.sentMessage!]);
        }
        if (result.ticket) {
            setTickets((current) =>
                current.map((ticket) => (ticket.id === result.ticket!.id ? result.ticket! : ticket)),
            );
        }
    }

    async function handleCloseTicket() {
        if (!activeTicketId) {
            return;
        }

        setIsSending(true);
        setError("");

        const result = await closeSupportTicket(userId, activeTicketId);
        setIsSending(false);

        if (!result.success) {
            setError(result.errors?.[0] ?? "Не вдалося закрити.");
            return;
        }

        if (result.ticket) {
            setTickets((current) =>
                current.map((ticket) => (ticket.id === result.ticket!.id ? result.ticket! : ticket)),
            );
        }

        setPendingCloseTicket(false);
        void loadThread(activeTicketId);
    }

    return (
        <div className="admin-support-panel">
            {pendingCloseTicket && activeTicket ? (
                <ModalPortal>
                    <div
                        className="review-modal-backdrop"
                        role="presentation"
                        onClick={() => !isSending && setPendingCloseTicket(false)}
                    >
                        <div
                            className="review-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="admin-close-ticket-title"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <h3 id="admin-close-ticket-title">Закрити звернення?</h3>
                            <p>
                                Ви впевнені, що хочете закрити звернення від{" "}
                                <strong>{activeTicket.customerName}</strong>? Клієнт більше не зможе писати в цей чат.
                            </p>
                            <div className="review-modal-actions">
                                <button
                                    type="button"
                                    className="secondary-button compact"
                                    onClick={() => setPendingCloseTicket(false)}
                                    disabled={isSending}
                                >
                                    Скасувати
                                </button>
                                <button
                                    type="button"
                                    className="primary-button compact"
                                    disabled={isSending}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => void handleCloseTicket()}
                                >
                                    {isSending ? "Закриваємо…" : "Так, закрити"}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            ) : null}
            <aside className="admin-support-sidebar">
                <div className="admin-support-sidebar-head">
                    <h2>Звернення</h2>
                    <button type="button" className="secondary-button compact" onClick={() => void loadTickets()}>
                        Оновити
                    </button>
                </div>
                {isLoading ? <p className="admin-support-meta">Завантаження…</p> : null}
                {!isLoading && tickets.length === 0 ? (
                    <p className="admin-support-meta">Ще немає звернень</p>
                ) : null}
                <ul className="admin-support-ticket-list">
                    {tickets.map((ticket) => (
                        <li key={ticket.id}>
                            <button
                                type="button"
                                className={`admin-support-ticket-card${
                                    activeTicketId === ticket.id ? " admin-support-ticket-card--active" : ""
                                }`}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => setActiveTicketId(ticket.id)}
                            >
                                <span className="admin-support-ticket-top">
                                    <span className="admin-support-ticket-name">{ticket.customerName}</span>
                                    <span className={`admin-support-status admin-support-status--${ticket.status.toLowerCase()}`}>
                                        {supportTicketStatusLabels[ticket.status]}
                                    </span>
                                </span>
                                <span className="admin-support-ticket-id">ID {ticket.userDisplayId}</span>
                                <span className="admin-support-ticket-preview">{ticket.preview}</span>
                                {ticket.unreadForStaff > 0 ? (
                                    <span className="admin-support-unread">{ticket.unreadForStaff}</span>
                                ) : null}
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>

            <section className="admin-support-chat">
                {!activeTicket ? (
                    <div className="admin-support-empty">
                        <p>Оберіть звернення зі списку, щоб відповісти клієнту.</p>
                    </div>
                ) : (
                    <>
                        <header className="admin-support-chat-head">
                            <div>
                                <h3>{activeTicket.subject ?? "Звернення"}</h3>
                                <p className="admin-support-meta">
                                    {activeTicket.customerName} · {activeTicket.customerPhone} · ID{" "}
                                    {activeTicket.userDisplayId}
                                </p>
                            </div>
                            {activeTicket.status !== "Closed" ? (
                                <button
                                    type="button"
                                    className="secondary-button compact admin-support-close-btn"
                                    disabled={isSending}
                                    onClick={() => setPendingCloseTicket(true)}
                                >
                                    Закрити
                                </button>
                            ) : null}
                        </header>

                        {error ? (
                            <p className="admin-support-error" role="alert">
                                {error}
                            </p>
                        ) : null}

                        <div className="admin-support-messages" ref={messagesRef}>
                            {messages.map((message) => (
                                <article key={message.id} className={messageClassName(message.senderType)}>
                                    <p className="admin-support-bubble-meta">
                                        {message.senderName ?? "—"} · {formatUkrainianDateTime(message.createdAtUtc)}
                                    </p>
                                    <p>{message.body}</p>
                                </article>
                            ))}
                            {otherPartyTyping ? <SupportTypingIndicator align="start" /> : null}
                        </div>

                        {activeTicket.status === "Closed" ? (
                            <p className="admin-support-meta admin-support-meta--warn">Звернення закрито.</p>
                        ) : (
                            <form className="admin-support-compose" onSubmit={handleSendMessage}>
                                <input
                                    className="admin-support-input"
                                    type="text"
                                    placeholder="Відповідь клієнту…"
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value)}
                                    disabled={isSending}
                                />
                                <button type="submit" className="primary-button compact" disabled={isSending || !draft.trim()}>
                                    {isSending ? "…" : "Надіслати"}
                                </button>
                            </form>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}
