import type { CreateOrderRequest } from "./orders";

export type CreateMonoInvoiceRequest = {
    amountKopiyky: number;
    destination: string;
    reference?: string;
    pendingOrder?: CreateOrderRequest;
};

export type CreateMonoInvoiceResponse = {
    success: boolean;
    invoiceId?: string;
    pageUrl?: string;
    reference?: string;
    error?: string;
};

export type MonoInvoiceStatusResponse = {
    success: boolean;
    status?: string;
    isPaid?: boolean;
    failureReason?: string;
    error?: string;
};

export type AdminPaymentInvoiceDto = {
    invoiceId: string;
    label: string;
    destination: string;
    amountKopiyky: number;
    pageUrl: string;
    reference: string;
    status: string;
    isPaid: boolean;
    isDeleted: boolean;
    createdAtUtc: string;
    expiresAtUtc: string;
    paidAtUtc?: string | null;
    deletedAtUtc?: string | null;
};

export type AdminPaymentInvoiceListResponse = {
    success: boolean;
    invoices?: AdminPaymentInvoiceDto[];
    error?: string;
};

export type CreateAdminMonoInvoiceBatchRequest = {
    userId: string;
    amountUah: number;
    destination?: string;
    labels?: string[];
    count?: number;
};

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
        return null;
    }

    return (await response.json()) as T;
}

export async function createAdminMonoInvoiceBatch(
    payload: CreateAdminMonoInvoiceBatchRequest,
): Promise<AdminPaymentInvoiceListResponse> {
    try {
        const response = await fetch("/api/payments/mono/invoice/admin/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: payload.userId,
                amount: Math.round(payload.amountUah * 100),
                destination: payload.destination,
                labels: payload.labels,
                count: payload.count,
            }),
        });

        const data = await parseJsonResponse<AdminPaymentInvoiceListResponse>(response);
        if (!data) {
            if (response.status === 404) {
                return {
                    success: false,
                    error: "Сервіс оплати не знайдено. Перезапустіть backend.",
                };
            }

            return {
                success: false,
                error: `Сервер повернув помилку (${response.status}).`,
            };
        }

        if (!response.ok && data.success !== false) {
            return { success: false, error: "Не вдалося створити рахунки." };
        }

        return data;
    } catch {
        return {
            success: false,
            error: "Помилка з'єднання з сервером. Перевірте, чи запущений backend.",
        };
    }
}

export async function fetchAdminMonoInvoices(
    userId: string,
    refresh = true,
): Promise<AdminPaymentInvoiceListResponse> {
    try {
        const response = await fetch(
            `/api/payments/mono/invoice/admin?userId=${encodeURIComponent(userId)}&refresh=${refresh ? "true" : "false"}`,
        );

        const data = await parseJsonResponse<AdminPaymentInvoiceListResponse>(response);
        if (!data) {
            return { success: false, error: "Не вдалося завантажити рахунки." };
        }

        return data;
    } catch {
        return { success: false, error: "Помилка з'єднання з сервером." };
    }
}

export async function refreshAdminMonoInvoices(
    userId: string,
): Promise<AdminPaymentInvoiceListResponse> {
    try {
        const response = await fetch("/api/payments/mono/invoice/admin/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
        });

        const data = await parseJsonResponse<AdminPaymentInvoiceListResponse>(response);
        if (!data) {
            return { success: false, error: "Не вдалося оновити статуси." };
        }

        return data;
    } catch {
        return { success: false, error: "Помилка з'єднання з сервером." };
    }
}

export async function deleteAdminMonoInvoice(
    userId: string,
    invoiceId: string,
): Promise<AdminPaymentInvoiceListResponse> {
    try {
        const response = await fetch("/api/payments/mono/invoice/admin/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, invoiceId }),
        });

        const data = await parseJsonResponse<AdminPaymentInvoiceListResponse>(response);
        if (!data) {
            return { success: false, error: "Не вдалося видалити рахунок." };
        }

        return data;
    } catch {
        return { success: false, error: "Помилка з'єднання з сервером." };
    }
}

export async function restoreAdminMonoInvoice(
    userId: string,
    invoiceId: string,
): Promise<AdminPaymentInvoiceListResponse> {
    try {
        const response = await fetch("/api/payments/mono/invoice/admin/restore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, invoiceId }),
        });

        const data = await parseJsonResponse<AdminPaymentInvoiceListResponse>(response);
        if (!data) {
            return { success: false, error: "Не вдалося відновити рахунок." };
        }

        return data;
    } catch {
        return { success: false, error: "Помилка з'єднання з сервером." };
    }
}

export async function createMonoInvoice(
    payload: CreateMonoInvoiceRequest,
): Promise<CreateMonoInvoiceResponse> {
    const response = await fetch("/api/payments/mono/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            amount: payload.amountKopiyky,
            destination: payload.destination,
            reference: payload.reference,
            pendingOrder: payload.pendingOrder,
        }),
    });

    const data = (await response.json()) as CreateMonoInvoiceResponse;

    if (!response.ok && data.success !== false) {
        return {
            success: false,
            error: "Не вдалося створити рахунок Monobank.",
        };
    }

    return data;
}

export async function fetchMonoInvoiceStatus(
    invoiceId: string,
): Promise<MonoInvoiceStatusResponse> {
    const response = await fetch(
        `/api/payments/mono/invoice/${encodeURIComponent(invoiceId)}/status`,
    );

    const data = (await response.json()) as MonoInvoiceStatusResponse;

    if (!response.ok && data.success !== false) {
        return {
            success: false,
            error: "Не вдалося перевірити статус оплати.",
        };
    }

    return data;
}

function sleep(ms: number) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

const FINAL_PAYMENT_STATUSES = new Set(["failure", "expired", "reversed"]);

export async function waitForMonoPaymentSuccess(
    invoiceId: string,
    options?: { maxAttempts?: number; delayMs?: number },
): Promise<MonoInvoiceStatusResponse> {
    const maxAttempts = options?.maxAttempts ?? 20;
    const delayMs = options?.delayMs ?? 1500;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const status = await fetchMonoInvoiceStatus(invoiceId);

        if (!status.success) {
            return status;
        }

        if (status.isPaid) {
            return status;
        }

        if (status.status && FINAL_PAYMENT_STATUSES.has(status.status)) {
            return {
                ...status,
                success: true,
                isPaid: false,
            };
        }

        if (attempt < maxAttempts - 1) {
            await sleep(delayMs);
        }
    }

    return {
        success: false,
        error: "Оплата ще обробляється. Оновіть сторінку через хвилину.",
    };
}
