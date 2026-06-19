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
