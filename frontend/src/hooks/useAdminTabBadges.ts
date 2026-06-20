import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchAdminJobApplications } from "../api/jobApplications";
import { fetchOrders, type OrderDto } from "../api/orders";
import { fetchAdminMonoInvoices, type AdminPaymentInvoiceDto } from "../api/payments";
import { fetchReviews } from "../api/reviews";
import { fetchAdminSupportTickets, type SupportTicketDto } from "../api/support";
import type { JobApplicationDto } from "../api/jobApplications";
import type { ReviewDto } from "../api/types";
import {
    acknowledgeInvoicesTab,
    acknowledgeOrdersTab,
    acknowledgeReviewsTab,
    acknowledgeSupportTab,
    acknowledgeVacanciesTab,
    countPaidInvoiceBadge,
    countPendingOrderBadge,
    countReviewBadge,
    countSupportBadge,
    countVacancyBadge,
    initializeAdminBadgeSnapshot,
    loadAdminBadgeSnapshot,
    type AdminBadgeSnapshot,
} from "../utils/adminTabBadges";

type AdminBadgeTab = "orders" | "invoices" | "reviews" | "support" | "vacancies";

export type AdminTabBadgeCounts = Record<AdminBadgeTab, number>;

const POLL_INTERVAL_MS = 15_000;

const emptySnapshot: AdminBadgeSnapshot = {
    initialized: false,
    pendingOrderIds: [],
    paidInvoiceIds: [],
    reviewIds: [],
    supportUnread: {},
    vacancyApplicationIds: [],
};

export function useAdminTabBadges(userId: string, activeTab: string) {
    const [snapshot, setSnapshot] = useState<AdminBadgeSnapshot>(() =>
        userId ? loadAdminBadgeSnapshot(userId) : emptySnapshot,
    );
    const [orders, setOrders] = useState<OrderDto[]>([]);
    const [invoices, setInvoices] = useState<AdminPaymentInvoiceDto[]>([]);
    const [reviews, setReviews] = useState<ReviewDto[]>([]);
    const [tickets, setTickets] = useState<SupportTicketDto[]>([]);
    const [applications, setApplications] = useState<JobApplicationDto[]>([]);

    const refresh = useCallback(async () => {
        if (!userId) {
            return;
        }

        try {
            const [ordersData, invoicesResult, reviewsData, ticketsData, applicationsData] =
                await Promise.all([
                    fetchOrders(userId),
                    fetchAdminMonoInvoices(userId, false),
                    fetchReviews(),
                    fetchAdminSupportTickets(userId),
                    fetchAdminJobApplications(userId),
                ]);
            const invoicesData = invoicesResult.success ? (invoicesResult.invoices ?? []) : [];

            setOrders(ordersData);
            setInvoices(invoicesData);
            setReviews(reviewsData);
            setTickets(ticketsData.tickets);
            setApplications(applicationsData.applications);
            setSnapshot((current) => {
                if (current.initialized) {
                    return current;
                }

                return initializeAdminBadgeSnapshot(
                    ordersData,
                    invoicesData,
                    reviewsData,
                    ticketsData.tickets,
                    applicationsData.applications,
                    userId,
                );
            });
        } catch {
            // Keep previous counts on transient failures.
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            return;
        }

        setSnapshot(loadAdminBadgeSnapshot(userId));
        void refresh();

        const intervalId = window.setInterval(() => {
            void refresh();
        }, POLL_INTERVAL_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [refresh, userId]);

    useEffect(() => {
        if (!userId) {
            return;
        }

        if (activeTab === "orders") {
            setSnapshot(acknowledgeOrdersTab(orders, userId));
            return;
        }

        if (activeTab === "invoices") {
            setSnapshot(acknowledgeInvoicesTab(invoices, userId));
            return;
        }

        if (activeTab === "reviews") {
            setSnapshot(acknowledgeReviewsTab(reviews, userId));
            return;
        }

        if (activeTab === "support") {
            setSnapshot(acknowledgeSupportTab(tickets, userId));
            return;
        }

        if (activeTab === "vacancies") {
            setSnapshot(acknowledgeVacanciesTab(applications, userId));
        }
    }, [activeTab, applications, invoices, orders, reviews, tickets, userId]);

    return useMemo<AdminTabBadgeCounts>(() => {
        const zero: AdminTabBadgeCounts = {
            orders: 0,
            invoices: 0,
            reviews: 0,
            support: 0,
            vacancies: 0,
        };

        if (!snapshot.initialized) {
            return zero;
        }

        const counts: AdminTabBadgeCounts = {
            orders: countPendingOrderBadge(orders, snapshot),
            invoices: countPaidInvoiceBadge(invoices, snapshot),
            reviews: countReviewBadge(reviews, snapshot),
            support: countSupportBadge(tickets, snapshot),
            vacancies: countVacancyBadge(applications, snapshot),
        };

        if (activeTab in counts) {
            counts[activeTab as AdminBadgeTab] = 0;
        }

        return counts;
    }, [activeTab, applications, invoices, orders, reviews, snapshot, tickets]);
}
