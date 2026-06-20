import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
    cancelOrder,
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

const ORDERS_PAGE_SIZE = 3;

const USER_ORDER_FILTERS = [
    { id: "active", label: "Активні" },
    { id: "completed", label: "Виконані" },
    { id: "cancelled", label: "Скасовані" },
] as const;

type UserOrderFilter = (typeof USER_ORDER_FILTERS)[number]["id"];

const staffTabModifiers: Record<OrderStatus, "fixed" | "custom" | "subscription"> = {
    PendingConfirmation: "fixed",
    Confirmed: "custom",
    Completed: "subscription",
    Cancelled: "fixed",
};

const staffTabShortLabels: Record<OrderStatus, string> = {
    PendingConfirmation: "Очікують",
    Confirmed: "Підтверджені",
    Completed: "Виконані",
    Cancelled: "Скасовані",
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

function filterUserOrders(orders: OrderDto[], filter: UserOrderFilter) {
    switch (filter) {
        case "active":
            return orders.filter(
                (order) => order.status === "PendingConfirmation" || order.status === "Confirmed",
            );
        case "completed":
            return orders.filter((order) => order.status === "Completed");
        case "cancelled":
            return orders.filter((order) => order.status === "Cancelled");
        default:
            return orders;
    }
}

type ProfileOrdersTabProps = {
    viewMode?: "profile" | "admin-panel";
};

export default function ProfileOrdersTab({ viewMode = "profile" }: ProfileOrdersTabProps) {
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
    const [userOrderFilter, setUserOrderFilter] = useState<UserOrderFilter>("active");
    const [visibleOrdersCount, setVisibleOrdersCount] = useState(ORDERS_PAGE_SIZE);
    const [orderIdSearch, setOrderIdSearch] = useState("");
    const [expandedOrderComments, setExpandedOrderComments] = useState<Record<string, boolean>>({});
    const [expandedOrderAddons, setExpandedOrderAddons] = useState<Record<string, boolean>>({});

    const userRole = user ? normalizeUserRole(user.role) : "User";
    const isAdmin = userRole === "Admin";
    const isStaff = isAdmin || userRole === "Employee";
    const showPersonalOrdersView = userRole === "User" || (isAdmin && viewMode === "profile");

    const personalOrders = useMemo(() => {
        if (isAdmin && viewMode === "profile" && user) {
            return orders.filter((order) => order.userId === user.id);
        }

        return orders;
    }, [isAdmin, orders, user, viewMode]);

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
            Cancelled: [],
        };

        const sourceOrders = personalOrders;

        for (const order of sourceOrders) {
            if (order.status === "Cancelled") {
                continue;
            }

            groups[order.status].push(order);
        }

        return groups;
    }, [personalOrders]);

    useEffect(() => {
        setVisibleOrdersCount(ORDERS_PAGE_SIZE);
    }, [activeStaffTab, orderIdSearch, userOrderFilter]);

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

    async function handleCancelOrder(orderId: string) {
        const confirmed = window.confirm(
            "Скасувати це замовлення? Після скасування його не можна буде відновити.",
        );
        if (!confirmed) {
            return;
        }

        setUpdatingOrderId(orderId);
        setActionError("");
        setActionSuccess("");

        try {
            const result = await cancelOrder({ userId: currentUser.id, orderId });

            if (!result.success) {
                setActionError(result.errors?.[0] ?? "Не вдалося скасувати замовлення.");
                return;
            }

            if (result.order) {
                setOrders((current) =>
                    current.map((order) => (order.id === result.order!.id ? result.order! : order)),
                );
            } else {
                await loadOrders({ silent: true });
            }

            setUserOrderFilter("cancelled");
            setActionSuccess(result.message ?? "Замовлення скасовано.");
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

        if (showPersonalOrdersView && order.canCancel) {
            return (
                <button
                    type="button"
                    className="secondary-button profile-order-action profile-order-action--cancel"
                    disabled={isUpdating}
                    onClick={() => void handleCancelOrder(order.id)}
                >
                    {isUpdating ? "Скасовуємо…" : "Скасувати замовлення"}
                </button>
            );
        }

        return null;
    }

    function renderOrdersList(items: OrderDto[]) {
        const visibleItems = items.slice(0, visibleOrdersCount);
        const hasMore = visibleItems.length < items.length;
        const canCollapse = visibleItems.length > ORDERS_PAGE_SIZE;

        return (
            <>
                <div className="profile-orders-list" role="list">
                    {visibleItems.map(renderOrderCard)}
                </div>
                {items.length > ORDERS_PAGE_SIZE ? (
                    <div className="profile-list-more">
                        <p className="profile-list-more-meta">
                            Показано {visibleItems.length} з {items.length}
                        </p>
                        <div className="profile-list-more-actions">
                            {canCollapse ? (
                                <button
                                    type="button"
                                    className="secondary-button compact"
                                    onClick={() => setVisibleOrdersCount(ORDERS_PAGE_SIZE)}
                                >
                                    Згорнути
                                </button>
                            ) : null}
                            {hasMore ? (
                                <button
                                    type="button"
                                    className="secondary-button compact"
                                    onClick={() =>
                                        setVisibleOrdersCount(
                                            (current) => current + ORDERS_PAGE_SIZE,
                                        )
                                    }
                                >
                                    Показати ще{" "}
                                    {Math.min(ORDERS_PAGE_SIZE, items.length - visibleItems.length)}
                                </button>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </>
        );
    }

    function renderOrderCard(order: OrderDto) {
        const isUpdating = updatingOrderId === order.id;
        const detailItems: { label: string; value: string }[] = [];

        if (isStaff) {
            detailItems.push({ label: "Клієнт", value: order.customerName });
        }

        if (order.address) {
            detailItems.push({ label: "Адреса", value: order.address });
        }

        const hasAddons = order.selectedAddons.length > 0;
        const addonsExpanded = expandedOrderAddons[order.id] ?? false;
        const shouldCollapseAddons = !isStaff && order.selectedAddons.length > 2;
        const addonsValue = !hasAddons
            ? "нема додаткових послуг"
            : shouldCollapseAddons && !addonsExpanded
              ? `${order.selectedAddons.length} послуг`
              : order.selectedAddons.join(" · ");

        detailItems.push({
            label: "Додаткові послуги",
            value: addonsValue,
        });

        if (isStaff) {
            detailItems.push({
                label: "Коментар",
                value: order.notes?.trim() || "коментар відсутній",
            });
        }

        const hasComment = Boolean(order.notes?.trim());
        const isCommentExpanded = expandedOrderComments[order.id] ?? false;

        return (
            <article
                key={order.id}
                className={`profile-order-card hero-panel${isUpdating ? " profile-order-card--updating" : ""}`}
            >
                <div className="profile-order-top">
                    <div className="profile-order-headline">
                        <p className="profile-order-id">№ {order.id.slice(0, 8).toUpperCase()}</p>
                        <h3 className="profile-order-title">{order.serviceTitle}</h3>
                    </div>
                    <span className={statusClass(order.status)}>{orderStatusLabels[order.status]}</span>
                </div>

                <div className="profile-order-chips">
                    {order.areaSqm ? (
                        <span className="profile-order-chip">
                            <span className="profile-order-chip-label">Площа</span>
                            <strong>{order.areaSqm} м²</strong>
                        </span>
                    ) : null}
                    {order.rooms ? (
                        <span className="profile-order-chip">
                            <span className="profile-order-chip-label">Кімнати</span>
                            <strong>{order.rooms}</strong>
                        </span>
                    ) : null}
                    {order.bathrooms ? (
                        <span className="profile-order-chip">
                            <span className="profile-order-chip-label">Санвузли</span>
                            <strong>{order.bathrooms}</strong>
                        </span>
                    ) : null}
                    <span className="profile-order-chip">
                        <span className="profile-order-chip-label">Бажаний час</span>
                        <strong>{order.timeSlotLabel}</strong>
                    </span>
                    <span className="profile-order-chip">
                        <span className="profile-order-chip-label">Спосіб оплати</span>
                        <strong>{paymentMethodLabels[order.paymentMethod]}</strong>
                    </span>
                </div>

                <div className="profile-order-bottom">
                    <div className="profile-order-details-wrap">
                        <dl className="profile-order-details">
                            {detailItems.map((item) => (
                                <div
                                    key={item.label}
                                    className={`profile-order-detail${
                                        item.label === "Додаткові послуги" && order.selectedAddons.length === 0
                                            ? " profile-order-detail--empty"
                                            : item.label === "Коментар"
                                              ? ` profile-order-detail--comment${
                                                    !hasComment ? " profile-order-detail--empty" : ""
                                                }`
                                              : ""
                                    }`}
                                >
                                    <dt>{item.label}</dt>
                                    <dd>{item.value}</dd>
                                </div>
                            ))}
                        </dl>

                        {!isStaff && shouldCollapseAddons ? (
                            <button
                                type="button"
                                className="profile-order-addons-toggle"
                                onClick={() =>
                                    setExpandedOrderAddons((current) => ({
                                        ...current,
                                        [order.id]: !current[order.id],
                                    }))
                                }
                                aria-expanded={addonsExpanded}
                            >
                                {addonsExpanded ? "Сховати послуги" : "Показати всі послуги"}
                            </button>
                        ) : null}
                    </div>

                    <div className="profile-order-summary">
                        <span className="profile-order-price">{formatPrice(order.payableAmount)}</span>
                        <time className="profile-order-date" dateTime={order.createdAtUtc}>
                            {formatDate(order.createdAtUtc)}
                        </time>
                    </div>
                </div>

                {!isStaff ? (
                    <div className="profile-order-comment">
                        {hasComment ? (
                            <>
                                <button
                                    type="button"
                                    className="profile-order-comment-toggle"
                                    onClick={() =>
                                        setExpandedOrderComments((current) => ({
                                            ...current,
                                            [order.id]: !current[order.id],
                                        }))
                                    }
                                    aria-expanded={isCommentExpanded}
                                >
                                    {isCommentExpanded ? "Сховати коментар" : "Прочитати коментар"}
                                </button>
                                {isCommentExpanded ? (
                                    <p className="profile-order-comment-text">{order.notes}</p>
                                ) : null}
                            </>
                        ) : (
                            <p className="profile-order-comment-empty">Коментар відсутній</p>
                        )}
                    </div>
                ) : null}

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

        if (personalOrders.length === 0) {
            return (
                <div className="profile-orders-empty">
                    <span className="profile-orders-empty-icon" aria-hidden="true">
                        ✨
                    </span>
                    <p>
                        {showPersonalOrdersView
                            ? "У вас ще немає замовлень. Оберіть послугу — ми підтвердимо деталі перед виїздом."
                            : "Замовлень поки немає."}
                    </p>
                    {showPersonalOrdersView ? (
                        <Link to="/services" className="primary-button compact">
                            Перейти до послуг
                        </Link>
                    ) : null}
                </div>
            );
        }

        if (showPersonalOrdersView) {
            const filteredUserOrders = filterUserOrders(personalOrders, userOrderFilter);

            return (
                <>
                    <div className="profile-orders-filter-bar" role="tablist" aria-label="Фільтр замовлень">
                        {USER_ORDER_FILTERS.map((filter) => {
                            const count = filterUserOrders(personalOrders, filter.id).length;

                            return (
                                <button
                                    key={filter.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={userOrderFilter === filter.id}
                                    className={`profile-orders-filter${
                                        userOrderFilter === filter.id ? " profile-orders-filter--active" : ""
                                    }`}
                                    onClick={() => setUserOrderFilter(filter.id)}
                                >
                                    {filter.label}
                                    <span className="profile-orders-filter-count">{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {filteredUserOrders.length === 0 ? (
                        <p className="profile-orders-empty profile-orders-empty--inline">
                            {userOrderFilter === "active"
                                ? "Немає активних замовлень"
                                : userOrderFilter === "completed"
                                  ? "Ще немає виконаних замовлень"
                                  : "Немає скасованих замовлень"}
                        </p>
                    ) : (
                        renderOrdersList(filteredUserOrders)
                    )}
                </>
            );
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
                    <div role="tabpanel">{renderOrdersList(filteredOrders)}</div>
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
