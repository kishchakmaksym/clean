import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
    createSupportTicket,
    fetchUserSupportThread,
    fetchUserSupportTickets,
    sendSupportUserMessage,
    sendSupportUserTyping,
    type SupportMessageDto,
    type SupportTicketDto,
} from "../../api/support";
import { useAuth } from "../../auth/AuthContext";
import SupportTypingIndicator from "./SupportTypingIndicator";
import { scrollSupportMessagesToBottom, useSupportTypingPulse } from "../../hooks/useSupportChat";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { formatUkrainianDateTime } from "../../utils/dateTime";
import "./SupportFab.css";

type SupportView = "auth" | "welcome" | "tickets" | "chat" | "new-ticket";

function HelpIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="support-fab-icon">
            <path
                d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="support-fab-icon">
            <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function BackIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="support-fab-icon support-fab-icon--small">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function messageClassName(senderType: SupportMessageDto["senderType"]) {
    if (senderType === "User") {
        return "support-chat-bubble support-chat-bubble--user";
    }
    if (senderType === "Staff") {
        return "support-chat-bubble support-chat-bubble--staff";
    }
    return "support-chat-bubble support-chat-bubble--system";
}

export default function SupportFab() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<SupportView>("auth");
    const [tickets, setTickets] = useState<SupportTicketDto[]>([]);
    const [userDisplayId, setUserDisplayId] = useState("");
    const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
    const [messages, setMessages] = useState<SupportMessageDto[]>([]);
    const [otherPartyTyping, setOtherPartyTyping] = useState(false);
    const [draft, setDraft] = useState("");
    const [faqConfirmed, setFaqConfirmed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState("");
    const rootRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<HTMLDivElement>(null);
    const lastMessageAtRef = useRef<string | undefined>(undefined);
    const lastMessageIdRef = useRef<string | undefined>(undefined);
    const panelId = useId();

    useBodyScrollLock(open);

    const loadTickets = useCallback(async () => {
        if (!user) {
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const data = await fetchUserSupportTickets(user.id);
            setTickets(data.tickets);
            setUserDisplayId(data.userDisplayId);
        } catch {
            setError("Не вдалося завантажити звернення.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const loadThread = useCallback(
        async (ticketId: string, sinceUtc?: string) => {
            if (!user) {
                return;
            }

            try {
                const data = await fetchUserSupportThread(user.id, ticketId, sinceUtc);
                setOtherPartyTyping(data.otherPartyTyping);
                setMessages((current) =>
                    sinceUtc ? [...current, ...data.messages] : data.messages,
                );
                setTickets((current) =>
                    current.map((ticket) => (ticket.id === data.ticket.id ? data.ticket : ticket)),
                );
            } catch {
                setError("Не вдалося оновити чат.");
            }
        },
        [user],
    );

    const sendTypingPulse = useCallback(() => {
        if (!user || !activeTicketId || !draft.trim()) {
            return;
        }

        void sendSupportUserTyping(user.id, activeTicketId);
    }, [activeTicketId, draft, user]);

    useSupportTypingPulse(
        Boolean(open && view === "chat" && activeTicketId && draft.trim()),
        sendTypingPulse,
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        if (!user) {
            setView("auth");
            return;
        }

        void loadTickets().then(() => {
            setView((current) => (current === "auth" ? "welcome" : current));
        });
    }, [loadTickets, open, user]);

    useEffect(() => {
        if (!open || view !== "chat" || !activeTicketId) {
            return;
        }

        void loadThread(activeTicketId);

        const intervalId = window.setInterval(() => {
            void loadThread(activeTicketId, lastMessageAtRef.current);
        }, 3000);

        return () => window.clearInterval(intervalId);
    }, [activeTicketId, loadThread, open, view]);

    useEffect(() => {
        const lastMessage = messages.at(-1);
        lastMessageAtRef.current = lastMessage?.createdAtUtc;

        const lastId = lastMessage?.id;
        const hasNewMessage = Boolean(lastId && lastId !== lastMessageIdRef.current);
        lastMessageIdRef.current = lastId;

        if (view === "chat" && hasNewMessage) {
            scrollSupportMessagesToBottom(messagesRef.current, "smooth");
        } else if (view === "chat" && otherPartyTyping) {
            scrollSupportMessagesToBottom(messagesRef.current, "auto");
        }
    }, [messages, otherPartyTyping, view]);

    useEffect(() => {
        if (!open) {
            return;
        }

        function handlePointerDown(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    function openTicket(ticketId: string) {
        setActiveTicketId(ticketId);
        setMessages([]);
        setOtherPartyTyping(false);
        setDraft("");
        lastMessageIdRef.current = undefined;
        setView("chat");
    }

    async function handleCreateTicket(event: React.FormEvent) {
        event.preventDefault();
        if (!user) {
            return;
        }

        const body = draft.trim();
        if (!body) {
            setError("Напишіть повідомлення.");
            return;
        }

        setIsSending(true);
        setError("");

        const result = await createSupportTicket({
            userId: user.id,
            body,
            faqChecked: faqConfirmed,
        });

        setIsSending(false);

        if (!result.success || !result.ticket) {
            setError(result.errors?.[0] ?? "Не вдалося створити звернення.");
            return;
        }

        setDraft("");
        setTickets((current) => [result.ticket!, ...current]);
        openTicket(result.ticket.id);
    }

    async function handleSendMessage(event: React.FormEvent) {
        event.preventDefault();
        if (!user || !activeTicketId) {
            return;
        }

        const body = draft.trim();
        if (!body) {
            return;
        }

        setIsSending(true);
        setError("");

        const result = await sendSupportUserMessage({
            userId: user.id,
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

    function renderHeaderTitle() {
        if (view === "chat" && activeTicketId) {
            const ticket = tickets.find((item) => item.id === activeTicketId);
            return ticket?.subject ?? "Чат підтримки";
        }
        if (view === "new-ticket") {
            return "Нове звернення";
        }
        if (view === "tickets") {
            return "Мої звернення";
        }
        return "Підтримка Smart Clean";
    }

    function renderBody() {
        if (view === "auth") {
            return (
                <div className="support-chat-empty">
                    <p className="support-chat-lead">
                        Щоб написати в підтримку, увійдіть або зареєструйтесь — так ми збережемо ваші звернення.
                    </p>
                    <Link to="/login" className="primary-button compact support-chat-action" onClick={() => setOpen(false)}>
                        Увійти / Реєстрація
                    </Link>
                </div>
            );
        }

        if (view === "welcome") {
            return (
                <div className="support-chat-welcome">
                    <div className="support-chat-bot-message">
                        <p>
                            Вітаємо в підтримці Smart Clean!
                            {userDisplayId ? ` Ваш ID: ${userDisplayId}.` : ""}
                        </p>
                        <p>
                            Можливо, відповідь на ваше питання вже є у{" "}
                            <Link to="/faq" className="support-chat-faq-link" onClick={() => setOpen(false)}>
                                FAQ
                            </Link>
                            . Якщо ні — зверніться до нас, і ми відповімо найближчим часом.
                        </p>
                    </div>
                    <label className="support-chat-check">
                        <input
                            type="checkbox"
                            checked={faqConfirmed}
                            onChange={(event) => setFaqConfirmed(event.target.checked)}
                        />
                        <span>мого питання там нема</span>
                    </label>
                    <button
                        type="button"
                        className="primary-button compact support-chat-action"
                        disabled={!faqConfirmed}
                        onClick={() => {
                            setError("");
                            setView(tickets.length > 0 ? "tickets" : "new-ticket");
                        }}
                    >
                        Звернутися до підтримки
                    </button>
                    {tickets.length > 0 ? (
                        <button
                            type="button"
                            className="secondary-button compact support-chat-action"
                            onClick={() => setView("tickets")}
                        >
                            Мої звернення ({tickets.length})
                        </button>
                    ) : null}
                </div>
            );
        }

        if (view === "tickets") {
            return (
                <div className="support-chat-tickets">
                    <button
                        type="button"
                        className="primary-button compact support-chat-action"
                        onClick={() => {
                            setDraft("");
                            setView("new-ticket");
                        }}
                    >
                        + Створити нове звернення
                    </button>
                    {isLoading ? <p className="support-chat-meta">Завантаження…</p> : null}
                    {!isLoading && tickets.length === 0 ? (
                        <p className="support-chat-meta">Ще немає звернень</p>
                    ) : null}
                    <ul className="support-chat-ticket-list">
                        {tickets.map((ticket) => (
                            <li key={ticket.id}>
                                <button
                                    type="button"
                                    className="support-chat-ticket-card"
                                    onClick={() => openTicket(ticket.id)}
                                >
                                    <span className="support-chat-ticket-subject">
                                        {ticket.subject ?? "Звернення"}
                                    </span>
                                    <span className="support-chat-ticket-preview">{ticket.preview}</span>
                                    <span className="support-chat-ticket-meta">
                                        {formatUkrainianDateTime(ticket.updatedAtUtc ?? ticket.createdAtUtc)}
                                        {ticket.unreadForUser > 0 ? (
                                            <span className="support-chat-unread">{ticket.unreadForUser}</span>
                                        ) : null}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            );
        }

        if (view === "new-ticket") {
            return (
                <form className="support-chat-compose" onSubmit={handleCreateTicket}>
                    <p className="support-chat-meta">
                        Опишіть проблему одним повідомленням — далі можна продовжити в чаті.
                    </p>
                    <textarea
                        className="support-chat-input support-chat-input--area"
                        rows={6}
                        placeholder="Ваше питання…"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        disabled={isSending}
                    />
                    <button type="submit" className="primary-button compact" disabled={isSending || !draft.trim()}>
                        {isSending ? "Створюємо…" : "Створити звернення"}
                    </button>
                </form>
            );
        }

        return (
            <div className="support-chat-thread">
                <div className="support-chat-messages" ref={messagesRef}>
                    {messages.map((message) => (
                        <article key={message.id} className={messageClassName(message.senderType)}>
                            <p className="support-chat-bubble-meta">
                                {message.senderName ?? "Підтримка"} ·{" "}
                                {formatUkrainianDateTime(message.createdAtUtc)}
                            </p>
                            <p>{message.body}</p>
                        </article>
                    ))}
                    {otherPartyTyping ? <SupportTypingIndicator align="start" /> : null}
                </div>
                {activeTicketId &&
                tickets.find((ticket) => ticket.id === activeTicketId)?.status === "Closed" ? (
                    <p className="support-chat-meta support-chat-meta--warn">
                        Звернення закрито. Створіть нове, якщо потрібна допомога.
                    </p>
                ) : (
                    <form className="support-chat-compose support-chat-compose--inline" onSubmit={handleSendMessage}>
                        <input
                            className="support-chat-input"
                            type="text"
                            placeholder="Напишіть повідомлення…"
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            disabled={isSending}
                        />
                        <button type="submit" className="primary-button compact" disabled={isSending || !draft.trim()}>
                            {isSending ? "…" : "Надіслати"}
                        </button>
                    </form>
                )}
            </div>
        );
    }

    return (
        <div className="support-fab" ref={rootRef}>
            {open ? (
                <div className="support-fab-panel" id={panelId} role="dialog" aria-label="Підтримка">
                    <header className="support-fab-header">
                        <div className="support-fab-header-main">
                            {view === "chat" || view === "new-ticket" || view === "tickets" ? (
                                <button
                                    type="button"
                                    className="support-fab-back"
                                    aria-label="Назад"
                                    onClick={() => {
                                        setError("");
                                        if (view === "chat") {
                                            setView("tickets");
                                            return;
                                        }
                                        setView("welcome");
                                    }}
                                >
                                    <BackIcon />
                                </button>
                            ) : null}
                            <div>
                                <p className="support-fab-header-title">{renderHeaderTitle()}</p>
                                {user && view !== "auth" ? (
                                    <p className="support-fab-header-sub">
                                        ID {userDisplayId || user.id.slice(0, 8).toUpperCase()}
                                    </p>
                                ) : (
                                    <p className="support-fab-header-sub">Онлайн-підтримка</p>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            className="support-fab-header-close"
                            aria-label="Закрити"
                            onClick={() => setOpen(false)}
                        >
                            <CloseIcon />
                        </button>
                    </header>

                    <div className="support-fab-body support-fab-body--chat">
                        {error ? (
                            <p className="support-chat-error" role="alert">
                                {error}
                            </p>
                        ) : null}
                        {renderBody()}
                    </div>

                    {view === "welcome" || view === "tickets" ? (
                        <footer className="support-fab-footer">
                            <Link to="/faq" className="support-fab-full-link" onClick={() => setOpen(false)}>
                                Всі питання FAQ →
                            </Link>
                        </footer>
                    ) : null}
                </div>
            ) : null}

            <button
                type="button"
                className={`support-fab-trigger${open ? " support-fab-trigger--open" : ""}`}
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={open ? "Закрити підтримку" : "Відкрити підтримку"}
                onClick={() => setOpen((current) => !current)}
            >
                {open ? <CloseIcon /> : <HelpIcon />}
            </button>
        </div>
    );
}
