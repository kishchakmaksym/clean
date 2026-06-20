export type OrderStatus = "PendingConfirmation" | "Confirmed" | "Completed" | "Cancelled";

export type PaymentMethodType = "card" | "cash";

export type OrderDto = {
    id: string;
    userId: string;
    customerName: string;
    status: OrderStatus;
    serviceId: string;
    serviceTitle: string;
    orderType: "fixed" | "custom";
    areaSqm?: number | null;
    rooms?: number | null;
    bathrooms?: number | null;
    selectedAddons: string[];
    timeSlot: string;
    timeSlotLabel: string;
    notes?: string | null;
    userAddressId?: string | null;
    address?: string | null;
    paymentMethod: PaymentMethodType;
    totalAmount: number;
    payableAmount: number;
    createdAtUtc: string;
    updatedAtUtc?: string | null;
    scheduledCleaningStartUtc: string;
    canCancel: boolean;
};

export type CreateOrderRequest = {
    userId: string;
    serviceId: string;
    serviceTitle: string;
    orderType: "fixed" | "custom";
    areaSqm?: number;
    rooms?: number;
    bathrooms?: number;
    selectedAddons?: string[];
    timeSlot: string;
    timeSlotLabel: string;
    notes?: string;
    addressId?: string;
    address?: string;
    paymentMethod: PaymentMethodType;
    totalAmount: number;
    payableAmount: number;
};

export type CreateOrderResponse = {
    success: boolean;
    message?: string;
    order?: OrderDto;
    errors?: string[];
};

export type UpdateOrderStatusRequest = {
    userId: string;
    orderId: string;
    status: OrderStatus;
};

export type UpdateOrderStatusResponse = {
    success: boolean;
    message?: string;
    order?: OrderDto;
    errors?: string[];
};

export type CancelOrderRequest = {
    userId: string;
    orderId: string;
};

export type CancelOrderResponse = UpdateOrderStatusResponse;

export async function createOrder(payload: CreateOrderRequest): Promise<CreateOrderResponse> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        const data = (await response.json()) as CreateOrderResponse;

        if (!response.ok && data.success !== false) {
            return { success: false, errors: ["Не вдалося створити замовлення."] };
        }

        return data;
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            return { success: false, errors: ["Сервер не відповідає. Спробуйте ще раз або перезапустіть backend."] };
        }

        return { success: false, errors: ["Помилка з'єднання з сервером."] };
    } finally {
        window.clearTimeout(timeoutId);
    }
}

export async function finalizeCardOrder(
    userId: string,
    invoiceId: string,
): Promise<CreateOrderResponse> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 45000);

    try {
        const response = await fetch("/api/orders/finalize-card", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, invoiceId }),
            signal: controller.signal,
        });

        const data = (await response.json()) as CreateOrderResponse;

        if (!response.ok && data.success !== false) {
            return { success: false, errors: ["Не вдалося підтвердити оплату."] };
        }

        return data;
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            return {
                success: false,
                errors: ["Перевірка оплати триває довше за звичайне. Оновіть сторінку через хвилину."],
            };
        }

        return { success: false, errors: ["Помилка з'єднання з сервером."] };
    } finally {
        window.clearTimeout(timeoutId);
    }
}

export async function finalizeLatestCardOrder(userId: string): Promise<CreateOrderResponse> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 45000);

    try {
        const response = await fetch(
            `/api/orders/finalize-card/latest?userId=${encodeURIComponent(userId)}`,
            {
                method: "POST",
                signal: controller.signal,
            },
        );

        const data = (await response.json()) as CreateOrderResponse;

        if (!response.ok && data.success !== false) {
            return { success: false, errors: ["Не вдалося підтвердити оплату."] };
        }

        return data;
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            return {
                success: false,
                errors: ["Перевірка оплати триває довше за звичайне. Оновіть сторінку через хвилину."],
            };
        }

        return { success: false, errors: ["Помилка з'єднання з сервером."] };
    } finally {
        window.clearTimeout(timeoutId);
    }
}

export async function fetchOrders(userId: string): Promise<OrderDto[]> {
    const response = await fetch(`/api/orders?userId=${encodeURIComponent(userId)}`);

    if (!response.ok) {
        throw new Error("Не вдалося завантажити замовлення.");
    }

    return (await response.json()) as OrderDto[];
}

export async function updateOrderStatus(
    payload: UpdateOrderStatusRequest,
): Promise<UpdateOrderStatusResponse> {
    const response = await fetch("/api/orders/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = (await response.json()) as UpdateOrderStatusResponse;

    if (!response.ok && data.success !== false) {
        return { success: false, errors: ["Не вдалося оновити статус замовлення."] };
    }

    return data;
}

export async function cancelOrder(payload: CancelOrderRequest): Promise<CancelOrderResponse> {
    const response = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = (await response.json()) as CancelOrderResponse;

    if (!response.ok && data.success !== false) {
        return { success: false, errors: ["Не вдалося скасувати замовлення."] };
    }

    return data;
}

export const orderStatusLabels: Record<OrderStatus, string> = {
    PendingConfirmation: "Очікує підтвердження",
    Confirmed: "Підтверджено",
    Completed: "Виконано",
    Cancelled: "Скасовано",
};

export const orderStatusGroupLabels: Record<OrderStatus, string> = {
    PendingConfirmation: "Очікують підтвердження",
    Confirmed: "Підтверджені",
    Completed: "Виконані",
    Cancelled: "Скасовані",
};

export const paymentMethodLabels: Record<PaymentMethodType, string> = {
    card: "Оплата картою",
    cash: "Оплата готівкою",
};
