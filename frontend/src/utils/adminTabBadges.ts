import type { OrderDto } from "../api/orders";
import type { AdminPaymentInvoiceDto } from "../api/payments";
import type { ReviewDto } from "../api/types";
import type { SupportTicketDto } from "../api/support";

export type AdminBadgeSnapshot = {
    initialized: boolean;
    pendingOrderIds: string[];
    paidInvoiceIds: string[];
    reviewIds: string[];
    supportUnread: Record<string, number>;
};

const emptySnapshot = (): AdminBadgeSnapshot => ({
    initialized: false,
    pendingOrderIds: [],
    paidInvoiceIds: [],
    reviewIds: [],
    supportUnread: {},
});
function storageKey(userId: string) {
    return `cleanpro-admin-badges-${userId}`;
}

export function loadAdminBadgeSnapshot(userId: string): AdminBadgeSnapshot {
    try {
        const raw = localStorage.getItem(storageKey(userId));
        if (!raw) {
            return emptySnapshot();
        }

        const parsed = JSON.parse(raw) as Partial<AdminBadgeSnapshot>;
        return {
            initialized: parsed.initialized === true,
            pendingOrderIds: Array.isArray(parsed.pendingOrderIds) ? parsed.pendingOrderIds : [],
            paidInvoiceIds: Array.isArray(parsed.paidInvoiceIds) ? parsed.paidInvoiceIds : [],
            reviewIds: Array.isArray(parsed.reviewIds) ? parsed.reviewIds : [],
            supportUnread:
                parsed.supportUnread && typeof parsed.supportUnread === "object"
                    ? parsed.supportUnread
                    : {},
        };
    } catch {
        return emptySnapshot();
    }
}

export function saveAdminBadgeSnapshot(userId: string, snapshot: AdminBadgeSnapshot) {
    localStorage.setItem(storageKey(userId), JSON.stringify(snapshot));
}

export function isPaidAdminInvoice(invoice: AdminPaymentInvoiceDto): boolean {
    return invoice.isPaid || invoice.status === "success";
}

export function countPendingOrderBadge(orders: OrderDto[], snapshot: AdminBadgeSnapshot): number {
    const acknowledged = new Set(snapshot.pendingOrderIds);
    return orders.filter(
        (order) => order.status === "PendingConfirmation" && !acknowledged.has(order.id),
    ).length;
}

export function countPaidInvoiceBadge(
    invoices: AdminPaymentInvoiceDto[],
    snapshot: AdminBadgeSnapshot,
): number {
    const acknowledged = new Set(snapshot.paidInvoiceIds);
    return invoices.filter(
        (invoice) => isPaidAdminInvoice(invoice) && !acknowledged.has(invoice.invoiceId),
    ).length;
}

export function countReviewBadge(reviews: ReviewDto[], snapshot: AdminBadgeSnapshot): number {
    const acknowledged = new Set(snapshot.reviewIds);
    return reviews.filter((review) => !acknowledged.has(review.id)).length;
}

export function countSupportBadge(tickets: SupportTicketDto[], snapshot: AdminBadgeSnapshot): number {
    return tickets.filter((ticket) => {
        const acknowledgedUnread = snapshot.supportUnread[ticket.id] ?? 0;
        return ticket.unreadForStaff > acknowledgedUnread;
    }).length;
}

export function acknowledgeOrdersTab(orders: OrderDto[], userId: string) {
    const snapshot = loadAdminBadgeSnapshot(userId);
    snapshot.pendingOrderIds = orders
        .filter((order) => order.status === "PendingConfirmation")
        .map((order) => order.id);
    snapshot.initialized = true;
    saveAdminBadgeSnapshot(userId, snapshot);
    return snapshot;
}

export function acknowledgeInvoicesTab(invoices: AdminPaymentInvoiceDto[], userId: string) {
    const snapshot = loadAdminBadgeSnapshot(userId);
    snapshot.paidInvoiceIds = invoices
        .filter((invoice) => isPaidAdminInvoice(invoice))
        .map((invoice) => invoice.invoiceId);
    snapshot.initialized = true;
    saveAdminBadgeSnapshot(userId, snapshot);
    return snapshot;
}

export function acknowledgeReviewsTab(reviews: ReviewDto[], userId: string) {
    const snapshot = loadAdminBadgeSnapshot(userId);
    snapshot.reviewIds = reviews.map((review) => review.id);
    snapshot.initialized = true;
    saveAdminBadgeSnapshot(userId, snapshot);
    return snapshot;
}

export function acknowledgeSupportTab(tickets: SupportTicketDto[], userId: string) {
    const snapshot = loadAdminBadgeSnapshot(userId);
    snapshot.supportUnread = Object.fromEntries(
        tickets.map((ticket) => [ticket.id, ticket.unreadForStaff]),
    );
    snapshot.initialized = true;
    saveAdminBadgeSnapshot(userId, snapshot);
    return snapshot;
}

export function initializeAdminBadgeSnapshot(
    orders: OrderDto[],
    invoices: AdminPaymentInvoiceDto[],
    reviews: ReviewDto[],
    tickets: SupportTicketDto[],
    userId: string,
) {
    const snapshot = loadAdminBadgeSnapshot(userId);
    if (snapshot.initialized) {
        return snapshot;
    }

    snapshot.pendingOrderIds = orders
        .filter((order) => order.status === "PendingConfirmation")
        .map((order) => order.id);
    snapshot.paidInvoiceIds = invoices
        .filter((invoice) => isPaidAdminInvoice(invoice))
        .map((invoice) => invoice.invoiceId);
    snapshot.reviewIds = reviews.map((review) => review.id);
    snapshot.supportUnread = Object.fromEntries(
        tickets.map((ticket) => [ticket.id, ticket.unreadForStaff]),
    );
    snapshot.initialized = true;
    saveAdminBadgeSnapshot(userId, snapshot);
    return snapshot;
}

export function formatAdminBadgeCount(count: number) {
    if (count <= 0) {
        return "";
    }

    return count > 99 ? "99+" : String(count);
}
