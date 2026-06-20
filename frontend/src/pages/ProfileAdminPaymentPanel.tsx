import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import {
    createAdminMonoInvoiceBatch,
    fetchAdminMonoInvoices,
    refreshAdminMonoInvoices,
    type AdminPaymentInvoiceDto,
} from "../api/payments";

type ProfileAdminPaymentPanelProps = {
    userId: string;
};

type StatusFilter = "all" | "pending" | "paid";

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

function isPendingInvoice(invoice: AdminPaymentInvoiceDto) {
    return !invoice.isPaid && !["expired", "failure", "reversed"].includes(invoice.status);
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
    onCopy,
}: {
    invoice: AdminPaymentInvoiceDto;
    copiedInvoiceId: string | null;
    onCopy: (invoiceId: string, pageUrl: string) => void;
}) {
    const [showQr, setShowQr] = useState(false);

    return (
        <article className={`profile-admin-invoice${invoice.isPaid ? " profile-admin-invoice--paid" : ""}`}>
            <div className="profile-admin-invoice-head">
                <div>
                    <h3 className="profile-admin-invoice-label">{invoice.label}</h3>
                    <p className="profile-admin-invoice-destination">{invoice.destination}</p>
                </div>
                <div className="profile-admin-invoice-meta">
                    <strong>{formatPrice(invoice.amountKopiyky)}</strong>
                    <span className={`profile-admin-invoice-status ${getStatusClass(invoice)}`}>
                        {getStatusLabel(invoice)}
                    </span>
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

export default function ProfileAdminPaymentPanel({ userId }: ProfileAdminPaymentPanelProps) {
    const [amount, setAmount] = useState("");
    const [destination, setDestination] = useState("");
    const [labelsRaw, setLabelsRaw] = useState("");
    const [count, setCount] = useState("1");
    const [invoices, setInvoices] = useState<AdminPaymentInvoiceDto[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);

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

        return invoices;
    }, [invoices, statusFilter]);

    const pendingCount = useMemo(() => invoices.filter(isPendingInvoice).length, [invoices]);
    const paidCount = useMemo(() => invoices.filter((invoice) => invoice.isPaid).length, [invoices]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        const parsedAmount = Number.parseInt(amount.trim(), 10);
        if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
            setError("Вкажіть суму не менше 1 ₴.");
            return;
        }

        if (parsedAmount > 999_999) {
            setError("Максимальна сума — 999 999 ₴.");
            return;
        }

        const labels = parseLabels(labelsRaw);
        const parsedCount = Number.parseInt(count.trim(), 10);
        const batchCount = labels.length > 0 ? labels.length : Number.isFinite(parsedCount) ? parsedCount : 1;

        if (batchCount < 1 || batchCount > 20) {
            setError("Можна створити від 1 до 20 рахунків за раз.");
            return;
        }

        setIsSubmitting(true);

        const result = await createAdminMonoInvoiceBatch({
            userId,
            amountUah: parsedAmount,
            destination: destination.trim() || undefined,
            labels: labels.length > 0 ? labels : undefined,
            count: labels.length > 0 ? undefined : batchCount,
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

        if (labels.length === 0) {
            setCount(String(batchCount));
        }
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

    return (
        <div className="profile-account-card profile-admin-payment">
            <h2 className="profile-sidebar-title">Рахунки на оплату</h2>
            <p className="profile-admin-payment-lead">
                Створюйте кілька посилань і QR-кодів одразу. Кожен рахунок дійсний 30 днів.
            </p>

            <form className="profile-form profile-form-edit" onSubmit={(event) => void handleSubmit(event)}>
                <label>
                    <span>Сума, ₴</span>
                    <input
                        type="number"
                        min={1}
                        max={999999}
                        step={1}
                        inputMode="numeric"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder="5000"
                        required
                    />
                </label>

                <label>
                    <span>Призначення</span>
                    <input
                        type="text"
                        value={destination}
                        onChange={(event) => setDestination(event.target.value)}
                        placeholder="Прибирання офісу"
                        maxLength={200}
                    />
                </label>

                <label>
                    <span>Позначки клієнтів</span>
                    <textarea
                        value={labelsRaw}
                        onChange={(event) => setLabelsRaw(event.target.value)}
                        placeholder={"Офіс А\nОфіс Б\nСалон на Хрещатику"}
                        rows={3}
                    />
                </label>

                <label>
                    <span>Кількість однакових рахунків</span>
                    <input
                        type="number"
                        min={1}
                        max={20}
                        step={1}
                        value={count}
                        onChange={(event) => setCount(event.target.value)}
                        disabled={parseLabels(labelsRaw).length > 0}
                    />
                </label>
                {parseLabels(labelsRaw).length === 0 ? (
                    <p className="profile-admin-payment-hint">
                        Якщо не вказуєте позначки — створиться стільки однакових посилань (#1, #2…).
                    </p>
                ) : null}

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
                    aria-selected={statusFilter === "all"}
                    className={`profile-admin-payment-filter${statusFilter === "all" ? " profile-admin-payment-filter--active" : ""}`}
                    onClick={() => setStatusFilter("all")}
                >
                    Усі ({invoices.length})
                </button>
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
            </div>

            {isLoading ? (
                <p className="profile-admin-payment-empty">Завантажуємо рахунки…</p>
            ) : filteredInvoices.length === 0 ? (
                <p className="profile-admin-payment-empty">
                    {statusFilter === "all"
                        ? "Ще немає створених рахунків."
                        : "Немає рахунків у цій категорії."}
                </p>
            ) : (
                <div className="profile-admin-invoice-list">
                    {filteredInvoices.map((invoice) => (
                        <AdminInvoiceCard
                            key={invoice.invoiceId}
                            invoice={invoice}
                            copiedInvoiceId={copiedInvoiceId}
                            onCopy={handleCopy}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
