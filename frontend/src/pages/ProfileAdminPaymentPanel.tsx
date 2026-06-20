import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import {
    createAdminMonoInvoiceBatch,
    deleteAdminMonoInvoice,
    fetchAdminMonoInvoices,
    refreshAdminMonoInvoices,
    restoreAdminMonoInvoice,
    type AdminPaymentInvoiceDto,
} from "../api/payments";
import { formatUkrainianDateTime } from "../utils/dateTime";
import ModalPortal from "../components/ModalPortal";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import "./ReviewsPage.css";

type ProfileAdminPaymentPanelProps = {
    userId: string;
    variant?: "sidebar" | "admin-panel";
};

type StatusFilter = "pending" | "paid" | "deleted" | "all";

// Backend зберігає суму в копійках (int32) — ~20 млн ₴ технічний максимум.
const MAX_INVOICE_AMOUNT = 20_000_000;

function parseAmountInput(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
        return null;
    }

    const value = Number.parseInt(digits, 10);
    if (!Number.isFinite(value)) {
        return null;
    }

    return Math.min(value, MAX_INVOICE_AMOUNT);
}

function formatAmountInput(value: number) {
    return value.toLocaleString("uk-UA");
}

function formatPrice(amountKopiyky: number) {
    return new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency: "UAH",
        maximumFractionDigits: 0,
    }).format(amountKopiyky / 100);
}

function buildQrCodeUrl(pageUrl: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pageUrl)}`;
}

function parseLabels(raw: string): string[] {
    return raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 20);
}

function formatInvoiceId(invoiceId: string) {
    const compact = invoiceId.replace(/-/g, "");
    if (compact.length <= 8) {
        return compact.toUpperCase();
    }

    return compact.slice(0, 8).toUpperCase();
}

function isPendingInvoice(invoice: AdminPaymentInvoiceDto) {
    return (
        !invoice.isDeleted &&
        !invoice.isPaid &&
        !["expired", "failure", "reversed"].includes(invoice.status)
    );
}

function isDeletedInvoice(invoice: AdminPaymentInvoiceDto) {
    return invoice.isDeleted && !invoice.isPaid;
}

function isVisibleInAllTab(invoice: AdminPaymentInvoiceDto) {
    return !invoice.isDeleted;
}

function getStatusLabel(invoice: AdminPaymentInvoiceDto) {
    if (invoice.isPaid || invoice.status === "success") {
        return "Оплачено";
    }

    if (invoice.status === "expired") {
        return "Протерміновано";
    }

    if (invoice.status === "failure" || invoice.status === "reversed") {
        return "Не оплачено";
    }

    return "Очікує оплати";
}

function getStatusClass(invoice: AdminPaymentInvoiceDto) {
    if (invoice.isDeleted && !invoice.isPaid) {
        return "profile-admin-invoice-status--deleted";
    }

    if (invoice.isPaid || invoice.status === "success") {
        return "profile-admin-invoice-status--paid";
    }

    if (invoice.status === "expired" || invoice.status === "failure" || invoice.status === "reversed") {
        return "profile-admin-invoice-status--failed";
    }

    return "profile-admin-invoice-status--pending";
}

function AdminInvoiceCard({
    invoice,
    copiedInvoiceId,
    actionInvoiceId,
    onCopy,
    onRequestDelete,
    onRestore,
}: {
    invoice: AdminPaymentInvoiceDto;
    copiedInvoiceId: string | null;
    actionInvoiceId: string | null;
    onCopy: (invoiceId: string, pageUrl: string) => void;
    onRequestDelete: (invoice: AdminPaymentInvoiceDto) => void;
    onRestore: (invoiceId: string) => void;
}) {
    const [showQr, setShowQr] = useState(false);
    const canDelete = !invoice.isPaid && !invoice.isDeleted;
    const canRestore = invoice.isDeleted && !invoice.isPaid;
    const isActionPending = actionInvoiceId === invoice.invoiceId;

    return (
        <article
            className={`profile-admin-invoice${invoice.isPaid ? " profile-admin-invoice--paid" : ""}${
                invoice.isDeleted ? " profile-admin-invoice--deleted" : ""
            }`}
        >
            <div className="profile-admin-invoice-head">
                <div>
                    <p className="profile-order-id">№ {formatInvoiceId(invoice.invoiceId)}</p>
                    <h3 className="profile-admin-invoice-label">{invoice.label}</h3>
                    <p className="profile-admin-invoice-destination">{invoice.destination}</p>
                    <p className="profile-admin-invoice-created">
                        Створено: {formatUkrainianDateTime(invoice.createdAtUtc)}
                    </p>
                </div>
                <div className="profile-admin-invoice-meta">
                    <span className={`profile-admin-invoice-status ${getStatusClass(invoice)}`}>
                        {invoice.isDeleted && !invoice.isPaid ? "Видалено" : getStatusLabel(invoice)}
                    </span>
                    <strong>{formatPrice(invoice.amountKopiyky)}</strong>
                    {canDelete ? (
                        <button
                            type="button"
                            className="profile-admin-invoice-action"
                            disabled={isActionPending}
                            onClick={() => onRequestDelete(invoice)}
                        >
                            Видалити
                        </button>
                    ) : null}
                    {canRestore ? (
                        <button
                            type="button"
                            className="profile-admin-invoice-action"
                            disabled={isActionPending}
                            onClick={() => onRestore(invoice.invoiceId)}
                        >
                            {isActionPending ? "Повернення…" : "Повернути"}
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="profile-admin-invoice-actions">
                <button
                    type="button"
                    className="secondary-button compact"
                    onClick={() => setShowQr((current) => !current)}
                >
                    {showQr ? "Сховати QR" : "QR-код"}
                </button>
                <button
                    type="button"
                    className="secondary-button compact"
                    onClick={() => onCopy(invoice.invoiceId, invoice.pageUrl)}
                >
                    {copiedInvoiceId === invoice.invoiceId ? "Скопійовано" : "Копіювати"}
                </button>
                <a
                    href={invoice.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-button compact profile-admin-invoice-open"
                >
                    Відкрити
                </a>
            </div>

            {showQr ? (
                <div className="profile-admin-invoice-qr-wrap">
                    <img
                        src={buildQrCodeUrl(invoice.pageUrl)}
                        width={160}
                        height={160}
                        alt={`QR-код для ${invoice.label}`}
                    />
                </div>
            ) : null}
        </article>
    );
}

export default function ProfileAdminPaymentPanel({
    userId,
    variant = "sidebar",
}: ProfileAdminPaymentPanelProps) {
    const [amount, setAmount] = useState("");
    const [destination, setDestination] = useState("");
    const [labelsRaw, setLabelsRaw] = useState("");
    const [invoices, setInvoices] = useState<AdminPaymentInvoiceDto[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);
    const [actionInvoiceId, setActionInvoiceId] = useState<string | null>(null);
    const [pendingDeleteInvoice, setPendingDeleteInvoice] = useState<AdminPaymentInvoiceDto | null>(null);

    useBodyScrollLock(pendingDeleteInvoice !== null);

    const loadInvoices = useCallback(async (refresh = true) => {
        const result = await fetchAdminMonoInvoices(userId, refresh);
        if (result.success && result.invoices) {
            setInvoices(result.invoices);
        }
    }, [userId]);

    useEffect(() => {
        void (async () => {
            setIsLoading(true);
            await loadInvoices(true);
            setIsLoading(false);
        })();
    }, [loadInvoices]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            void loadInvoices(true);
        }, 30_000);

        return () => window.clearInterval(intervalId);
    }, [loadInvoices]);

    const filteredInvoices = useMemo(() => {
        if (statusFilter === "paid") {
            return invoices.filter((invoice) => invoice.isPaid);
        }

        if (statusFilter === "pending") {
            return invoices.filter(isPendingInvoice);
        }

        if (statusFilter === "deleted") {
            return invoices.filter(isDeletedInvoice);
        }

        return invoices.filter(isVisibleInAllTab);
    }, [invoices, statusFilter]);

    const pendingCount = useMemo(() => invoices.filter(isPendingInvoice).length, [invoices]);
    const paidCount = useMemo(() => invoices.filter((invoice) => invoice.isPaid).length, [invoices]);
    const deletedCount = useMemo(() => invoices.filter(isDeletedInvoice).length, [invoices]);
    const allCount = useMemo(() => invoices.filter(isVisibleInAllTab).length, [invoices]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        const parsedAmount = parseAmountInput(amount);
        if (parsedAmount === null || parsedAmount < 1) {
            setError("Вкажіть суму не менше 1 ₴.");
            return;
        }

        if (parsedAmount > MAX_INVOICE_AMOUNT) {
            setError(`Максимальна сума — ${formatAmountInput(MAX_INVOICE_AMOUNT)} ₴.`);
            return;
        }

        const labels = parseLabels(labelsRaw);
        if (labels.length > 20) {
            setError("Можна створити не більше 20 рахунків за раз.");
            return;
        }

        setIsSubmitting(true);

        const result = await createAdminMonoInvoiceBatch({
            userId,
            amountUah: parsedAmount,
            destination: destination.trim() || undefined,
            labels: labels.length > 0 ? labels : undefined,
        });

        setIsSubmitting(false);

        if (!result.success || !result.invoices?.length) {
            setError(result.error ?? "Не вдалося створити рахунки.");
            return;
        }

        setInvoices((current) => {
            const existingIds = new Set(current.map((item) => item.invoiceId));
            const created = result.invoices!.filter((item) => !existingIds.has(item.invoiceId));
            return [...created, ...current];
        });
    }

    async function handleRefresh() {
        setIsRefreshing(true);
        setError("");

        const result = await refreshAdminMonoInvoices(userId);
        if (!result.success || !result.invoices) {
            setError(result.error ?? "Не вдалося оновити статуси.");
            setIsRefreshing(false);
            return;
        }

        setInvoices(result.invoices);
        setIsRefreshing(false);
    }

    async function handleCopy(invoiceId: string, pageUrl: string) {
        try {
            await navigator.clipboard.writeText(pageUrl);
            setCopiedInvoiceId(invoiceId);
            window.setTimeout(() => setCopiedInvoiceId(null), 2000);
        } catch {
            setError("Не вдалося скопіювати посилання.");
        }
    }

    async function handleConfirmDelete() {
        if (!pendingDeleteInvoice) {
            return;
        }

        setError("");
        setActionInvoiceId(pendingDeleteInvoice.invoiceId);

        const result = await deleteAdminMonoInvoice(userId, pendingDeleteInvoice.invoiceId);

        setActionInvoiceId(null);

        if (!result.success || !result.invoices) {
            setError(result.error ?? "Не вдалося видалити рахунок.");
            return;
        }

        setInvoices(result.invoices);
        window.setTimeout(() => setPendingDeleteInvoice(null), 150);
    }

    function closeDeleteModal() {
        setPendingDeleteInvoice(null);
    }

    async function handleRestore(invoiceId: string) {
        setError("");
        setActionInvoiceId(invoiceId);

        const result = await restoreAdminMonoInvoice(userId, invoiceId);

        setActionInvoiceId(null);

        if (!result.success || !result.invoices) {
            setError(result.error ?? "Не вдалося відновити рахунок.");
            return;
        }

        setInvoices(result.invoices);
    }

    return (
        <div
            className={`${
                variant === "admin-panel" ? "profile-admin-payment--panel" : "profile-account-card"
            } profile-admin-payment`}
        >
            {pendingDeleteInvoice ? (
                <ModalPortal>
                    <div
                        className="review-modal-backdrop"
                        role="presentation"
                        onMouseDown={closeDeleteModal}
                    >
                    <div
                        className="review-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-delete-invoice-title"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <h3 id="admin-delete-invoice-title">Видалити рахунок?</h3>
                        <p>
                            Рахунок <strong>№ {formatInvoiceId(pendingDeleteInvoice.invoiceId)}</strong> (
                            {pendingDeleteInvoice.label}) перейде у «Видалені». Посилання на оплату залишиться
                            дійсним.
                        </p>
                        <div className="review-modal-actions">
                            <button
                                type="button"
                                className="secondary-button compact"
                                onClick={closeDeleteModal}
                                disabled={actionInvoiceId === pendingDeleteInvoice.invoiceId}
                            >
                                Скасувати
                            </button>
                            <button
                                type="button"
                                className="primary-button compact"
                                disabled={actionInvoiceId === pendingDeleteInvoice.invoiceId}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    void handleConfirmDelete();
                                }}
                            >
                                {actionInvoiceId === pendingDeleteInvoice.invoiceId
                                    ? "Видалення…"
                                    : "Так, видалити"}
                            </button>
                        </div>
                    </div>
                    </div>
                </ModalPortal>
            ) : null}

            <h2 className="profile-sidebar-title">Рахунки на оплату</h2>
            {variant !== "admin-panel" ? (
                <p className="profile-admin-payment-lead">
                    Створюйте кілька посилань і QR-кодів одразу. Кожен рахунок дійсний 30 днів.
                </p>
            ) : null}

            <form className="profile-form profile-form-edit" onSubmit={(event) => void handleSubmit(event)}>
                <label>
                    <span>Сума, ₴</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={amount}
                        onChange={(event) => {
                            const parsed = parseAmountInput(event.target.value);
                            setAmount(parsed === null ? "" : formatAmountInput(parsed));
                        }}
                        required
                    />
                </label>

                <label>
                    <span>Призначення</span>
                    <input
                        type="text"
                        value={destination}
                        onChange={(event) => setDestination(event.target.value)}
                        maxLength={200}
                    />
                </label>

                <label>
                    <span>Позначки клієнтів</span>
                    <textarea
                        value={labelsRaw}
                        onChange={(event) => setLabelsRaw(event.target.value)}
                        rows={3}
                        className={variant === "admin-panel" ? "profile-admin-labels-input" : undefined}
                    />
                </label>

                {error ? (
                    <p className="profile-account-error" role="alert">
                        {error}
                    </p>
                ) : null}

                <button type="submit" className="primary-button" disabled={isSubmitting}>
                    {isSubmitting ? "Створюємо…" : "Створити рахунки"}
                </button>
            </form>

            <div className="profile-admin-payment-list-head">
                <h3 className="profile-admin-payment-list-title">Створені рахунки</h3>
                <button
                    type="button"
                    className="secondary-button compact"
                    disabled={isRefreshing}
                    onClick={() => void handleRefresh()}
                >
                    {isRefreshing ? "Оновлюємо…" : "Оновити статуси"}
                </button>
            </div>

            <div className="profile-admin-payment-filters" role="tablist" aria-label="Фільтр рахунків">
                <button
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === "pending"}
                    className={`profile-admin-payment-filter${statusFilter === "pending" ? " profile-admin-payment-filter--active" : ""}`}
                    onClick={() => setStatusFilter("pending")}
                >
                    Очікують ({pendingCount})
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === "paid"}
                    className={`profile-admin-payment-filter${statusFilter === "paid" ? " profile-admin-payment-filter--active" : ""}`}
                    onClick={() => setStatusFilter("paid")}
                >
                    Оплачені ({paidCount})
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === "all"}
                    className={`profile-admin-payment-filter${statusFilter === "all" ? " profile-admin-payment-filter--active" : ""}`}
                    onClick={() => setStatusFilter("all")}
                >
                    Усі ({allCount})
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === "deleted"}
                    className={`profile-admin-payment-filter${statusFilter === "deleted" ? " profile-admin-payment-filter--active" : ""}`}
                    onClick={() => setStatusFilter("deleted")}
                >
                    Видалені ({deletedCount})
                </button>
            </div>

            {isLoading ? (
                <p className="profile-admin-payment-empty">Завантажуємо рахунки…</p>
            ) : filteredInvoices.length === 0 ? (
                <p className="profile-admin-payment-empty">
                    {statusFilter === "all"
                        ? "Ще немає створених рахунків."
                        : statusFilter === "deleted"
                          ? "Немає видалених рахунків."
                          : "Немає рахунків у цій категорії."}
                </p>
            ) : (
                <div className="profile-admin-invoice-list">
                    {filteredInvoices.map((invoice) => (
                        <AdminInvoiceCard
                            key={invoice.invoiceId}
                            invoice={invoice}
                            copiedInvoiceId={copiedInvoiceId}
                            actionInvoiceId={actionInvoiceId}
                            onCopy={handleCopy}
                            onRequestDelete={setPendingDeleteInvoice}
                            onRestore={handleRestore}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
