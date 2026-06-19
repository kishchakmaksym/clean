import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
    fetchOrders,
    finalizeCardOrder,
    finalizeLatestCardOrder,
    orderStatusGroupLabels,
    orderStatusLabels,
    paymentMethodLabels,
    updateOrderStatus,
    type OrderDto,
    type OrderStatus,
} from "../api/orders";
import { normalizeUserRole } from "../api/types";
import {
    clearPendingOrder,
    getPendingOrder,
    releaseFinalizeLock,
    tryAcquireFinalizeLock,
} from "../api/pendingOrder";
import { useAuth } from "../auth/AuthContext";
import { formatUkrainianDateTime } from "../utils/dateTime";
import "./ServicesPage.css";

const STAFF_ORDER_TABS = ["PendingConfirmation", "Confirmed", "Completed"] as const;

const staffTabModifiers: Record<OrderStatus, "fixed" | "custom" | "subscription"> = {
    PendingConfirmation: "fixed",
    Confirmed: "custom",
    Completed: "subscription",
};

const staffTabShortLabels: Record<OrderStatus, string> = {
    PendingConfirmation: "Очікують",
    Confirmed: "Підтверджені",
    Completed: "Виконані",
};

function formatPrice(value: number) {
    return `${value.toLocaleString("uk-UA")} ₴`;
}

function formatDate(value: string) {
    return formatUkrainianDateTime(value);
}

function statusClass(status: OrderStatus) {
    return `profile-order-status profile-order-status--${status.toLowerCase()}`;
}

function orderMatchesIdQuery(order: OrderDto, query: string) {
    const normalizedQuery = query.trim().replace(/[\s-]/g, "").toLowerCase();
    if (!normalizedQuery) {
        return true;
    }

    return order.id.replace(/-/g, "").toLowerCase().includes(normalizedQuery);
}

export default function ProfileOrdersTab() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const paymentSuccess = searchParams.get("paid") === "1";
    const [orders, setOrders] = useState<OrderDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [actionError, setActionError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [isFinalizingPayment, setIsFinalizingPayment] = useState(false);
    const [paymentFinalizeError, setPaymentFinalizeError] = useState("");
    const [paymentSucceeded, setPaymentSucceeded] = useState(false);
    const [activeStaffTab, setActiveStaffTab] = useState<OrderStatus>("PendingConfirmation");
    const [orderIdSearch, setOrderIdSearch] = useState("");

    const loadOrders = useCallback(async (options?: { silent?: boolean }) => {
        if (!user) {
            return;
        }

        if (!options?.silent) {
            setIsLoading(true);
        }
        setLoadError("");

        try {
            const data = await fetchOrders(user.id);
            setOrders(data);
        } catch {
            setLoadError("Не вдалося завантажити замовлення.");
        } finally {
            if (!options?.silent) {
                setIsLoading(false);
            }
        }
    }, [user]);

    useEffect(() => {
        void loadOrders();
    }, [loadOrders]);

    useEffect(() => {
        if (!paymentSuccess || !user) {
            return;
        }

        const currentUser = user;

        async function finalizePaidOrder() {
            const pending = getPendingOrder();
            const invoiceId = pending?.invoiceId;

            if (!invoiceId) {
                setIsFinalizingPayment(true);
                setPaymentFinalizeError("");
                setPaymentSucceeded(false);

                const result = await finalizeLatestCardOrder(currentUser.id);

                if (!result.success || !result.order) {
                    setPaymentFinalizeError(
                        result.errors?.[0] ??
                            "Не вдалося знайти оплачене замовлення. Оновіть сторінку або зверніться до підтримки.",
                    );
                    setIsFinalizingPayment(false);
                    return;
                }

                clearPendingOrder();
                setPaymentSucceeded(true);
                await loadOrders({ silent: true });
                setIsFinalizingPayment(false);
                return;
            }

            if (!pending || pending.userId !== currentUser.id) {
                if (pending && pending.userId !== currentUser.id) {
                    setPaymentFinalizeError("Не вдалося підтвердити оплату для цього акаунта.");
                }
                return;
            }

            if (!tryAcquireFinalizeLock(pending.invoiceId)) {
                return;
            }

            setIsFinalizingPayment(true);
            setPaymentFinalizeError("");
            setPaymentSucceeded(false);

            try {
                const result = await finalizeCardOrder(currentUser.id, pending.invoiceId);

                if (!result.success || !result.order) {
                    setPaymentFinalizeError(
                        result.errors?.[0] ?? "Оплату отримано, але не вдалося зберегти замовлення.",
                    );
                    releaseFinalizeLock();
                    return;
                }

                clearPendingOrder();
                setPaymentSucceeded(true);
                await loadOrders({ silent: true });
            } finally {
                setIsFinalizingPayment(false);
            }
        }

        void finalizePaidOrder();
    }, [loadOrders, paymentSuccess, user]);

    const groupedOrders = useMemo(() => {
        const groups: Record<OrderStatus, OrderDto[]> = {
            PendingConfirmation: [],
            Confirmed: [],
            Completed: [],
        };

        for (const order of orders) {
            groups[order.status].push(order);
        }

        return groups;
    }, [orders]);

    const orderStats = useMemo(
        () => ({
            total: orders.length,
            pending: groupedOrders.PendingConfirmation.length,
            completed: groupedOrders.Completed.length,
        }),
        [groupedOrders, orders.length],
    );

    useEffect(() => {
        if (!actionSuccess) {
            return;
        }

        const timeoutId = window.setTimeout(() => setActionSuccess(""), 3200);
        return () => window.clearTimeout(timeoutId);
    }, [actionSuccess]);

    if (!user) {
        return null;
    }

    const currentUser = user;
    const userRole = normalizeUserRole(currentUser.role);
    const isAdmin = userRole === "Admin";
    const isStaff = isAdmin || userRole === "Employee";

    async function handleStatusUpdate(orderId: string, status: OrderStatus) {
        setUpdatingOrderId(orderId);
        setActionError("");
        setActionSuccess("");

        try {
            const result = await updateOrderStatus({ userId: currentUser.id, orderId, status });

            if (!result.success) {
                setActionError(result.errors?.[0] ?? "Не вдалося оновити статус.");
                return;
            }

            if (result.order) {
                setOrders((current) =>
                    current.map((order) => (order.id === result.order!.id ? result.order! : order)),
                );
            } else {
                await loadOrders({ silent: true });
            }

            setActionSuccess(result.message ?? "Статус оновлено.");
        } catch {
            setActionError("Помилка з'єднання з сервером.");
        } finally {
            setUpdatingOrderId(null);
        }
    }

    function renderOrderActions(order: OrderDto, isUpdating: boolean) {
        if (isAdmin && order.status === "PendingConfirmation") {
            return (
                <button
                    type="button"
                    className="primary-button profile-order-action"
                    disabled={isUpdating}
                    onClick={() => void handleStatusUpdate(order.id, "Confirmed")}
                >
                    {isUpdating ? "Зберігаємо…" : "Підтвердити замовлення"}
                </button>
            );
        }

        if (isAdmin && order.status === "Confirmed") {
            return (
                <div className="profile-order-actions">
                    <button
                        type="button"
                        className="primary-button profile-order-action profile-order-action--complete"
                        disabled={isUpdating}
                        onClick={() => void handleStatusUpdate(order.id, "Completed")}
                    >
                        {isUpdating ? "Зберігаємо…" : "Позначити виконаним"}
                    </button>
                    <button
                        type="button"
                        className="secondary-button profile-order-action profile-order-action--revert"
                        disabled={isUpdating}
                        onClick={() => void handleStatusUpdate(order.id, "PendingConfirmation")}
                    >
                        {isUpdating ? "Зберігаємо…" : "Повернути на очікування"}
                    </button>
                </div>
            );
        }

        if (isAdmin && order.status === "Completed") {
            return (
                <button
                    type="button"
                    className="secondary-button profile-order-action profile-order-action--revert"
                    disabled={isUpdating}
                    onClick={() => void handleStatusUpdate(order.id, "Confirmed")}
                >
                    {isUpdating ? "Зберігаємо…" : "Повернути на підтверджені"}
                </button>
            );
        }

        if (isStaff && order.status === "Confirmed") {
            return (
                <button
                    type="button"
                    className="primary-button profile-order-action profile-order-action--complete"
                    disabled={isUpdating}
                    onClick={() => void handleStatusUpdate(order.id, "Completed")}
                >
                    {isUpdating ? "Зберігаємо…" : "Позначити виконаним"}
                </button>
            );
        }

        return null;
    }

    function renderOrderCard(order: OrderDto) {
        const isUpdating = updatingOrderId === order.id;
        const metaItems: { label: string; value: string }[] = [];

        if (isStaff) {
            metaItems.push({ label: "Клієнт", value: order.customerName });
        }

        if (order.selectedAddons.length > 0) {
            metaItems.push({ label: "Додатково", value: order.selectedAddons.join(", ") });
        }

        if (order.notes) {
            metaItems.push({ label: "Коментар", value: order.notes });
        }

        if (order.address) {
            metaItems.push({ label: "Адреса", value: order.address });
        }

        return (
            <article
                key={order.id}
                className={`profile-order-card hero-panel${isUpdating ? " profile-order-card--updating" : ""}`}
            >
                <div className="profile-order-top">
                    <div>
                        <p className="profile-order-id">№ {order.id.slice(0, 8).toUpperCase()}</p>
                        <h3 className="profile-order-title">{order.serviceTitle}</h3>
                    </div>
                    <span className={statusClass(order.status)}>{orderStatusLabels[order.status]}</span>
                </div>

                <div className="profile-order-chips">
                    {order.areaSqm ? (
                        <span className="profile-order-chip">
                            Площа <strong>{order.areaSqm} м²</strong>
                        </span>
                    ) : null}
                    {order.rooms ? (
                        <span className="profile-order-chip">
                            Кімнати <strong>{order.rooms}</strong>
                        </span>
                    ) : null}
                    {order.bathrooms ? (
                        <span className="profile-order-chip">
                            Санвузли <strong>{order.bathrooms}</strong>
                        </span>
                    ) : null}
                    <span className="profile-order-chip">
                        Час <strong>{order.timeSlotLabel}</strong>
                    </span>
                    <span className="profile-order-chip">
                        Оплата <strong>{paymentMethodLabels[order.paymentMethod]}</strong>
                    </span>
                </div>

                {metaItems.length > 0 ? (
                    <ul className="profile-order-meta">
                        {metaItems.map((item) => (
                            <li key={item.label}>
                                <span>{item.label}</span>
                                <span>{item.value}</span>
                            </li>
                        ))}
                    </ul>
                ) : null}

                <div className="profile-order-footer">
                    <span className="profile-order-price">{formatPrice(order.payableAmount)}</span>
                    <span className="profile-order-date">{formatDate(order.createdAtUtc)}</span>
                </div>

                {renderOrderActions(order, isUpdating)}
            </article>
        );
    }

    function renderOrdersSection() {
        if (isLoading) {
            return (
                <div className="profile-loading" aria-busy="true">
                    <span className="profile-loading-dot" aria-hidden="true" />
                    Завантажуємо замовлення…
                </div>
            );
        }

        if (loadError) {
            return <p className="profile-orders-error">{loadError}</p>;
        }

        if (orders.length === 0) {
            return (
                <div className="profile-orders-empty">
                    <span className="profile-orders-empty-icon" aria-hidden="true">
                        ✨
                    </span>
                    <p>
                        {userRole === "User"
                            ? "У вас ще немає замовлень. Оберіть послугу — ми підтвердимо деталі перед виїздом."
                            : "Замовлень поки немає."}
                    </p>
                    {userRole === "User" ? (
                        <Link to="/services" className="primary-button compact">
                            Перейти до послуг
                        </Link>
                    ) : null}
                </div>
            );
        }

        if (userRole === "User") {
            return <div className="profile-orders-list">{orders.map(renderOrderCard)}</div>;
        }

        const activeOrders = groupedOrders[activeStaffTab];
        const filteredOrders = isAdmin
            ? activeOrders.filter((order) => orderMatchesIdQuery(order, orderIdSearch))
            : activeOrders;
        const hasActiveSearch = isAdmin && orderIdSearch.trim().length > 0;

        return (
            <>
                <div className="services-tabs-wrap profile-orders-tabs-wrap">
                    <div
                        className={`services-tabs services-tabs--${staffTabModifiers[activeStaffTab]}`}
                        role="tablist"
                        aria-label="Статус замовлень"
                    >
                        <span className="services-tabs-indicator" aria-hidden="true" />
                        {STAFF_ORDER_TABS.map((status) => (
                            <button
                                key={status}
                                type="button"
                                role="tab"
                                aria-selected={activeStaffTab === status}
                                className={`services-tab${activeStaffTab === status ? " services-tab--active" : ""}`}
                                onClick={() => setActiveStaffTab(status)}
                            >
                                <span className="services-tab-label services-tab-label--full">
                                    {orderStatusGroupLabels[status]} ({groupedOrders[status].length})
                                </span>
                                <span className="services-tab-label services-tab-label--short">
                                    {staffTabShortLabels[status]} ({groupedOrders[status].length})
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {isAdmin ? (
                    <label className="profile-orders-search">
                        <span className="profile-orders-search-label">Пошук за ID</span>
                        <input
                            type="search"
                            value={orderIdSearch}
                            onChange={(event) => setOrderIdSearch(event.target.value)}
                            placeholder="Наприклад, 059B5253"
                            aria-label="Пошук замовлення за ID"
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </label>
                ) : null}

                {filteredOrders.length > 0 ? (
                    <div className="profile-orders-list" role="tabpanel">
                        {filteredOrders.map(renderOrderCard)}
                    </div>
                ) : (
                    <p className="profile-orders-empty profile-orders-empty--inline">
                        {hasActiveSearch
                            ? "Замовлення з таким ID не знайдено в цьому розділі"
                            : "Немає замовлень у цій категорії"}
                    </p>
                )}
            </>
        );
    }

    return (
        <div className="profile-payment-stack">
            {paymentSuccess && (isFinalizingPayment || paymentSucceeded) ? (
                <div className="profile-payment-banner hero-panel" role="status">
                    <p>
                        {isFinalizingPayment
                            ? "Перевіряємо оплату та зберігаємо замовлення…"
                            : "Оплату отримано. Замовлення з'явилось у списку нижче."}
                    </p>
                    <button
                        type="button"
                        className="secondary-button compact"
                        onClick={() => setSearchParams({})}
                    >
                        Закрити
                    </button>
                </div>
            ) : null}

            {paymentFinalizeError ? (
                <div className="profile-orders-error profile-payment-banner" role="alert">
                    <p>{paymentFinalizeError}</p>
                    {paymentSuccess ? (
                        <button
                            type="button"
                            className="secondary-button compact"
                            onClick={() => window.location.reload()}
                        >
                            Спробувати ще раз
                        </button>
                    ) : null}
                </div>
            ) : null}

            <div className="profile-stats">
                <article className="profile-stat">
                    <span className="profile-stat-value">{orderStats.total}</span>
                    <span className="profile-stat-label">Усього</span>
                </article>
                <article className="profile-stat profile-stat--pending">
                    <span className="profile-stat-value">{orderStats.pending}</span>
                    <span className="profile-stat-label">Чекають</span>
                </article>
                <article className="profile-stat profile-stat--completed">
                    <span className="profile-stat-value">{orderStats.completed}</span>
                    <span className="profile-stat-label">Виконано</span>
                </article>
            </div>

            {actionSuccess ? (
                <p className="profile-action-toast profile-action-toast--success" role="status">
                    {actionSuccess}
                </p>
            ) : null}

            {actionError ? (
                <p className="profile-action-toast profile-action-toast--error" role="alert">
                    {actionError}
                </p>
            ) : null}
            {renderOrdersSection()}
        </div>
    );
}
