import type { CreateOrderRequest } from "./orders";

export const PENDING_ORDER_STORAGE_KEY = "cleanpro_pending_order";
const FINALIZE_LOCK_KEY = "cleanpro_finalize_lock";

export type PendingOrderPayload = CreateOrderRequest & {
    paymentReference: string;
    description: string;
    invoiceId: string;
};

export function savePendingOrder(payload: PendingOrderPayload) {
    localStorage.setItem(PENDING_ORDER_STORAGE_KEY, JSON.stringify(payload));
}

export function getPendingOrder(): PendingOrderPayload | null {
    const raw =
        localStorage.getItem(PENDING_ORDER_STORAGE_KEY) ??
        sessionStorage.getItem(PENDING_ORDER_STORAGE_KEY);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as PendingOrderPayload;
    } catch {
        return null;
    }
}

export function consumePendingOrder(): PendingOrderPayload | null {
    const pending = getPendingOrder();
    if (pending) {
        clearPendingOrder();
    }

    return pending;
}

export function clearPendingOrder() {
    localStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
    sessionStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
}

export function tryAcquireFinalizeLock(invoiceId: string): boolean {
    const currentLock = sessionStorage.getItem(FINALIZE_LOCK_KEY);
    if (currentLock === invoiceId) {
        return false;
    }

    sessionStorage.setItem(FINALIZE_LOCK_KEY, invoiceId);
    return true;
}

export function releaseFinalizeLock() {
    sessionStorage.removeItem(FINALIZE_LOCK_KEY);
}
