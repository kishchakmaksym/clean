import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import {
    fetchOrders,
    finalizeCardOrder,
    finalizeLatestCardOrder,
    orderStatusLabels,
    paymentMethodLabels,
    updateOrderStatus,
    type OrderDto,
    type OrderStatus,
} from "../api/orders";
import {
    clearPendingOrder,
    getPendingOrder,
    releaseFinalizeLock,
    tryAcquireFinalizeLock,
} from "../api/pendingOrder";
import type { UserRole } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { formatUkrainianDateTime } from "../utils/dateTime";
import "./AuthPage.css";
import "./HomePage.css";
import "./ProfilePage.css";

function formatPrice(value: number) {
    return `${value.toLocaleString("uk-UA")} ₴`;
}

function formatDate(value: string) {
    return formatUkrainianDateTime(value);
}

function statusClass(status: OrderStatus) {
    return `profile-order-status profile-order-status--${status.toLowerCase()}`;
}

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const paymentSuccess = searchParams.get("paid") === "1";
    const [orders, setOrders] = useState<OrderDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [actionError, setActionError] = useState("");
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [isFinalizingPayment, setIsFinalizingPayment] = useState(false);
    const [paymentFinalizeError, setPaymentFinalizeError] = useState("");
    const [paymentSucceeded, setPaymentSucceeded] = useState(false);

    const loadOrders = useCallback(async () => {
        if (!user) {
            return;
        }

        setIsLoading(true);
        setLoadError("");

        try {
            const data = await fetchOrders(user.id);
            setOrders(data);
        } catch {
            setLoadError("Не вдалося завантажити замовлення.");
        } finally {
            setIsLoading(false);
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
                await loadOrders();
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
                await loadOrders();
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

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const profileUser = user;

    const roleLabels: Record<UserRole, string> = {
        User: "Користувач",
        Employee: "Працівник",
        Admin: "Адміністратор",
    };

    async function handleStatusUpdate(orderId: string, status: "Confirmed" | "Completed") {
        if (!user) {
            return;
        }

        setUpdatingOrderId(orderId);
        setActionError("");

        try {
            const result = await updateOrderStatus({ userId: user.id, orderId, status });

            if (!result.success) {
                setActionError(result.errors?.[0] ?? "Не вдалося оновити статус.");
                return;
            }

            await loadOrders();
        } catch {
            setActionError("Помилка з'єднання з сервером.");
        } finally {
            setUpdatingOrderId(null);
        }
    }

    function renderOrderCard(order: OrderDto) {
        const isUpdating = updatingOrderId === order.id;

        return (
            <article key={order.id} className="profile-order-card hero-panel">
                <div className="profile-order-head">
                    <div>
                        <p className="profile-order-id">№ {order.id.slice(0, 8).toUpperCase()}</p>
                        <h3 className="profile-order-title">{order.serviceTitle}</h3>
                    </div>
                    <span className={statusClass(order.status)}>{orderStatusLabels[order.status]}</span>
                </div>

                <ul className="profile-order-details">
                    {profileUser.role !== "User" ? (
                        <li>
                            <span>Клієнт</span>
                            <span>{order.customerName}</span>
                        </li>
                    ) : null}
                    <li>
                        <span>Тариф</span>
                        <span>{order.serviceTitle}</span>
                    </li>
                    {order.areaSqm ? (
                        <li>
                            <span>Площа</span>
                            <span>{order.areaSqm} м²</span>
                        </li>
                    ) : null}
                    {order.rooms ? (
                        <li>
                            <span>Кімнати</span>
                            <span>{order.rooms}</span>
                        </li>
                    ) : null}
                    {order.bathrooms ? (
                        <li>
                            <span>Санвузли</span>
                            <span>{order.bathrooms}</span>
                        </li>
                    ) : null}
                    <li>
                        <span>Бажаний час</span>
                        <span>{order.timeSlotLabel}</span>
                    </li>
                    <li>
                        <span>Оплата</span>
                        <span>{paymentMethodLabels[order.paymentMethod]}</span>
                    </li>
                    <li>
                        <span>Сума</span>
                        <span>{formatPrice(order.payableAmount)}</span>
                    </li>
                    {order.selectedAddons.length > 0 ? (
                        <li>
                            <span>Додатково</span>
                            <span>{order.selectedAddons.join(", ")}</span>
                        </li>
                    ) : null}
                    {order.notes ? (
                        <li>
                            <span>Коментар</span>
                            <span>{order.notes}</span>
                        </li>
                    ) : null}
                    <li>
                        <span>Створено</span>
                        <span>{formatDate(order.createdAtUtc)}</span>
                    </li>
                </ul>

                {profileUser.role === "Admin" && order.status === "PendingConfirmation" ? (
                    <button
                        type="button"
                        className="primary-button profile-order-action"
                        disabled={isUpdating}
                        onClick={() => void handleStatusUpdate(order.id, "Confirmed")}
                    >
                        {isUpdating ? "Зберігаємо…" : "Підтвердити замовлення"}
                    </button>
                ) : null}

                {(profileUser.role === "Employee" || profileUser.role === "Admin") &&
                order.status === "Confirmed" ? (
                    <button
                        type="button"
                        className="primary-button profile-order-action"
                        disabled={isUpdating}
                        onClick={() => void handleStatusUpdate(order.id, "Completed")}
                    >
                        {isUpdating ? "Зберігаємо…" : "Замовлення виконано"}
                    </button>
                ) : null}
            </article>
        );
    }

    function renderOrdersSection() {
        if (isLoading) {
            return <p className="profile-orders-empty">Завантажуємо замовлення…</p>;
        }

        if (loadError) {
            return <p className="profile-orders-error">{loadError}</p>;
        }

        if (orders.length === 0) {
            return (
                <p className="profile-orders-empty">
                    {profileUser.role === "User"
                        ? "У вас ще немає замовлень. Оберіть послугу на сторінці «Послуги»."
                        : "Замовлень поки немає."}
                </p>
            );
        }

        if (profileUser.role === "User") {
            return <div className="profile-orders-list">{orders.map(renderOrderCard)}</div>;
        }

        return (
            <div className="profile-orders-groups">
                {(["PendingConfirmation", "Confirmed", "Completed"] as const).map((status) => (
                    <section key={status} className="profile-orders-group">
                        <div className="profile-orders-group-head">
                            <h3>{orderStatusLabels[status]}</h3>
                            <span className="profile-orders-count">{groupedOrders[status].length}</span>
                        </div>
                        {groupedOrders[status].length > 0 ? (
                            <div className="profile-orders-list">
                                {groupedOrders[status].map(renderOrderCard)}
                            </div>
                        ) : (
                            <p className="profile-orders-empty profile-orders-empty--inline">Немає замовлень</p>
                        )}
                    </section>
                ))}
            </div>
        );
    }

    return (
        <section className="section auth-page profile-page">
            {paymentSuccess && (isFinalizingPayment || paymentSucceeded) ? (
                <div className="profile-payment-banner hero-panel" role="status">
                    <p>
                        {isFinalizingPayment
                            ? "Перевіряємо оплату та зберігаємо замовлення…"
                            : "Оплату отримано. Замовлення з'явилось у списку нижче."}
                    </p>
                    <button
                        type="button"
                        className="services-back"
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
                            className="services-back"
                            onClick={() => window.location.reload()}
                        >
                            Спробувати ще раз
                        </button>
                    ) : null}
                </div>
            ) : null}

            <div className="section-head">
                <h2>Профіль</h2>
                <p>
                    {profileUser.role === "User"
                        ? "Ваші дані та замовлення."
                        : "Кабінет персоналу CleanPro."}
                </p>
            </div>

            <div className="auth-card profile-card">
                <div className="profile-fields">
                    <div className="profile-field">
                        <span className="profile-label">Роль</span>
                        <span className="profile-value">{roleLabels[profileUser.role]}</span>
                    </div>
                    <div className="profile-field">
                        <span className="profile-label">Ім&apos;я</span>
                        <span className="profile-value">{profileUser.name}</span>
                    </div>
                    <div className="profile-field">
                        <span className="profile-label">Електронна пошта</span>
                        <span className="profile-value">{profileUser.email}</span>
                    </div>
                    <div className="profile-field">
                        <span className="profile-label">Телефон</span>
                        <span className="profile-value">{profileUser.phone}</span>
                    </div>
                </div>

                <button type="button" className="primary-button profile-logout" onClick={logout}>
                    Вийти
                </button>
            </div>

            <div className="profile-orders-section">
                <div className="section-head profile-orders-head">
                    <h2>{profileUser.role === "User" ? "Мої замовлення" : "Замовлення"}</h2>
                    <p>
                        {profileUser.role === "Admin"
                            ? "Усі замовлення у трьох статусах."
                            : profileUser.role === "Employee"
                              ? "Підтверджені замовлення можна позначити виконаними."
                              : "Статус оновлюється після дзвінка менеджера."}
                    </p>
                </div>

                {actionError ? <p className="profile-orders-error">{actionError}</p> : null}
                {renderOrdersSection()}
            </div>
        </section>
    );
}
