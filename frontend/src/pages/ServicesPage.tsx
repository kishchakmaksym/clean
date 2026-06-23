import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { createMonoInvoice } from "../api/payments";
import { createOrder } from "../api/orders";
import { savePendingOrder, type PendingOrderPayload } from "../api/pendingOrder";
import { buildOrderAddressFields, fetchProfile, type UserAddressDto } from "../api/profile";
import { validateServiceAreaAddress } from "../utils/serviceAreaAddress";
import { supportContacts } from "../config/contacts";
import {
    allOrderExtras,
    buildCustomOrganizationalNote,
    customCleaningTypes,
    MIN_CUSTOM_ORDER_TOTAL,
    customExtraCategories,
    pollutionLevelOptions,
    propertyTypeOptions,
    calculateCustomExtraTotal,
    customExtraUsesQuantity,
    getSelectedCustomExtraLabels,
    getTopSellerExtras,
    formatCustomExtraRate,
    getCustomExtraQuantityLabel,
    type CustomExtraItem,
} from "../config/customCleaningOptions";
import {
    describeVisitDayRanges,
    estimateSubscriptionOrder,
    formatVisitDaysSummary,
    MIN_SUBSCRIPTION_PER_VISIT,
    normalizeVisitDays,
    SUBSCRIPTION_CYCLE_DAYS,
} from "../config/subscriptionOptions";
import OrderAddressSelector from "../components/profile/OrderAddressSelector";
import AutoResizeTextarea from "../components/AutoResizeTextarea";
import { useAuth } from "../auth/AuthContext";
import "./HomePage.css";
import "./ServicesPage.css";

type ServiceTab = "fixed" | "custom" | "subscription" | "business";

function parseServiceTab(value: string | null): ServiceTab {
    if (value === "custom" || value === "business") {
        return value;
    }

    return "fixed";
}

function scrollToServicesSection(element: HTMLElement | null) {
    if (!element) {
        return;
    }

    const header = document.querySelector(".header");
    const tabs = document.querySelector(".services-tabs-wrap");
    const offset =
        (header?.getBoundingClientRect().height ?? 0) +
        (tabs?.getBoundingClientRect().height ?? 0) +
        12;
    const top = element.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

type FixedPackageItem = {
    id: string;
    label: string;
    defaultSelected: boolean;
    adjustment: number;
    group?: string;
};

type FixedServiceCategory = {
    id: string;
    title: string;
    text: string;
    duration: string;
    packageItems: readonly FixedPackageItem[];
    flatPrice?: number;
    basePerSqm?: number;
    /** Перші N м² за basePerSqm; решта — за sqmTierRate */
    sqmTierThreshold?: number;
    sqmTierRate?: number;
};

const fixedServiceCategories: readonly FixedServiceCategory[] = [
    {
        id: "express",
        title: "Експрес-прибирання",
        text: "Швидке наведення порядку для підтримки чистоти в оселі без глибокого очищення.",
        duration: "1–2 год",
        basePerSqm: 35,
        sqmTierThreshold: 50,
        sqmTierRate: 30,
        packageItems: [
            { id: "vacuum", label: "Пропилососити підлогу", defaultSelected: true, adjustment: 0 },
            { id: "mop", label: "Швидко помити підлогу", defaultSelected: true, adjustment: 0 },
            { id: "mirrors", label: "Протерти дзеркала", defaultSelected: true, adjustment: 0 },
            { id: "tidy", label: "Скласти розкидані речі", defaultSelected: true, adjustment: 0 },
            { id: "dust", label: "Витерти пил з відкритих поверхонь", defaultSelected: true, adjustment: 0 },
            { id: "trash", label: "Винести сміття", defaultSelected: true, adjustment: 0 },
            { id: "windows", label: "Миття вікон", defaultSelected: false, adjustment: 250 },
            { id: "fridge", label: "Холодильник", defaultSelected: false, adjustment: 180 },
            { id: "kitchen", label: "Вологе прибирання кухні", defaultSelected: false, adjustment: 200 },
            { id: "bathroom", label: "Санвузол", defaultSelected: false, adjustment: 180 },
        ],
    },
    {
        id: "basic-clean",
        title: "Базове прибирання",
        text: "Повний базовий цикл для квартири — усе необхідне для охайного результату.",
        duration: "2–3 год",
        basePerSqm: 45,
        sqmTierThreshold: 50,
        sqmTierRate: 40,
        packageItems: [
            { id: "room-dust", label: "Видалення пилу з усіх доступних поверхонь", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "room-sills", label: "Протирання підвіконь", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "room-vacuum", label: "Пилососіння підлоги та килимів", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "room-mop", label: "Вологе миття підлоги", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "room-mirrors", label: "Протирання дзеркал", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "room-doors", label: "Протирання дверей і ручок", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "room-tidy", label: "Легке впорядкування речей на відкритих поверхнях", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "room-trash", label: "Винесення сміття", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "kit-counter", label: "Протирання стільниці", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "kit-sink", label: "Миття раковини та змішувача", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "kit-stove", label: "Очищення варильної поверхні", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "kit-appliances", label: "Зовнішнє очищення холодильника, мікрохвильовки та іншої техніки", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "kit-facades", label: "Протирання фасадів кухні", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "kit-table", label: "Протирання обіднього столу", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "bath-toilet", label: "Миття унітаза", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "bath-sink", label: "Миття раковини", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "bath-tub", label: "Очищення ванни або душової кабіни", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "bath-faucets", label: "Очищення змішувачів", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "bath-mirrors", label: "Протирання дзеркал", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "bath-bags", label: "Заміна сміттєвих пакетів", defaultSelected: true, adjustment: 0, group: "Санвузол" },
        ],
    },
    {
        id: "deep-clean",
        title: "Генеральне прибирання",
        text: "Глибоке прибирання всієї квартири — кімнати, кухня, санвузол і важкодоступні зони.",
        duration: "4–8 год",
        basePerSqm: 75,
        sqmTierThreshold: 50,
        sqmTierRate: 70,
        packageItems: [
            { id: "gen-room-dust", label: "Видалення пилу з усіх поверхонь", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "gen-room-sills", label: "Протирання підвіконь", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "gen-room-vacuum", label: "Пилососіння підлоги та килимів", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "gen-room-mop", label: "Вологе миття підлоги", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "gen-room-baseboards", label: "Протирання плінтусів", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "gen-room-doors", label: "Очищення дверей і дверних ручок", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "gen-room-switches", label: "Очищення вимикачів і розеток", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "gen-room-mirrors", label: "Протирання дзеркал", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "gen-room-furniture", label: "Очищення меблів зовні", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "gen-room-cabinets", label: "Очищення фасадів шаф", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "gen-room-hard-reach", label: "Видалення пилу з важкодоступних місць", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "gen-room-trash", label: "Винесення сміття", defaultSelected: true, adjustment: 0, group: "Кімнати" },
            { id: "gen-kit-counter", label: "Очищення стільниці", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "gen-kit-sink", label: "Миття раковини та змішувача", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "gen-kit-stove", label: "Очищення варильної поверхні", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "gen-kit-hood", label: "Миття витяжки зовні", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "gen-kit-facades", label: "Очищення фасадів кухні", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "gen-kit-backsplash", label: "Очищення кухонного фартуха", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "gen-kit-fridge", label: "Миття холодильника зовні", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "gen-kit-microwave", label: "Миття мікрохвильової печі зовні", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "gen-kit-oven", label: "Очищення духовки зовні", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "gen-kit-table", label: "Очищення столу та стільців", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "gen-bath-toilet", label: "Очищення унітаза", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "gen-bath-sink", label: "Очищення раковини", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "gen-bath-tub", label: "Очищення ванни або душової кабіни", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "gen-bath-lime", label: "Видалення вапняного нальоту", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "gen-bath-faucets", label: "Очищення змішувачів", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "gen-bath-mirrors", label: "Протирання дзеркал", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "gen-bath-tile", label: "Очищення плитки", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "gen-bath-plumbing", label: "Очищення сантехніки", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "gen-bath-trash", label: "Винесення сміття", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "gen-extra-windows", label: "Миття вікон зсередини", defaultSelected: false, adjustment: 300, group: "Додатково" },
            { id: "gen-extra-lights", label: "Протирання освітлювальних приладів", defaultSelected: false, adjustment: 180, group: "Додатково" },
            { id: "gen-extra-radiators", label: "Очищення радіаторів", defaultSelected: false, adjustment: 200, group: "Додатково" },
            { id: "gen-extra-cornices", label: "Очищення карнизів", defaultSelected: false, adjustment: 150, group: "Додатково" },
            { id: "gen-extra-appliances", label: "Протирання побутової техніки зовні", defaultSelected: false, adjustment: 160, group: "Додатково" },
        ],
    },
    {
        id: "after-renovation",
        title: "Прибирання після ремонту",
        text: "Прибираємо будівельний пил, сліди матеріалів і дрібні залишки після будівельних робіт.",
        basePerSqm: 105,
        sqmTierThreshold: 50,
        sqmTierRate: 100,
        duration: "6–12 год",
        packageItems: [
            { id: "ren-all-dust", label: "Видалення будівельного пилу з усіх поверхонь", defaultSelected: true, adjustment: 0, group: "Усі приміщення" },
            { id: "ren-all-walls", label: "Очищення стін від пилу", defaultSelected: true, adjustment: 0, group: "Усі приміщення" },
            { id: "ren-all-baseboards", label: "Очищення плінтусів", defaultSelected: true, adjustment: 0, group: "Усі приміщення" },
            { id: "ren-all-vacuum", label: "Пилососіння підлоги промисловим пилососом", defaultSelected: true, adjustment: 0, group: "Усі приміщення" },
            { id: "ren-all-mop", label: "Вологе миття підлоги", defaultSelected: true, adjustment: 0, group: "Усі приміщення" },
            { id: "ren-all-doors", label: "Очищення дверей і дверних ручок", defaultSelected: true, adjustment: 0, group: "Усі приміщення" },
            { id: "ren-all-switches", label: "Очищення вимикачів та розеток", defaultSelected: true, adjustment: 0, group: "Усі приміщення" },
            { id: "ren-all-radiators", label: "Очищення радіаторів", defaultSelected: true, adjustment: 0, group: "Усі приміщення" },
            { id: "ren-all-lights", label: "Очищення освітлювальних приладів", defaultSelected: true, adjustment: 0, group: "Усі приміщення" },
            { id: "ren-all-trash", label: "Винесення будівельного сміття в межах домовленості", defaultSelected: true, adjustment: 0, group: "Усі приміщення" },
            { id: "ren-win-inside", label: "Миття вікон зсередини", defaultSelected: true, adjustment: 0, group: "Вікна" },
            { id: "ren-win-frames", label: "Очищення рам і підвіконь", defaultSelected: true, adjustment: 0, group: "Вікна" },
            { id: "ren-win-film", label: "Видалення захисної плівки", defaultSelected: true, adjustment: 0, group: "Вікна" },
            { id: "ren-win-glass", label: "Очищення скла від слідів фарби та клею", defaultSelected: true, adjustment: 0, group: "Вікна" },
            { id: "ren-kit-facades", label: "Очищення фасадів", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "ren-kit-counter", label: "Очищення стільниці", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "ren-kit-sink", label: "Миття раковини та змішувача", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "ren-kit-backsplash", label: "Очищення кухонного фартуха", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "ren-kit-appliances", label: "Зовнішнє очищення техніки", defaultSelected: true, adjustment: 0, group: "Кухня" },
            { id: "ren-bath-tile", label: "Очищення плитки", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "ren-bath-grout", label: "Видалення залишків затирки та будівельного пилу", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "ren-bath-plumbing", label: "Очищення сантехніки", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "ren-bath-lime", label: "Видалення вапняного нальоту", defaultSelected: true, adjustment: 0, group: "Санвузол" },
            { id: "ren-bath-mirrors", label: "Миття дзеркал", defaultSelected: true, adjustment: 0, group: "Санвузол" },
        ],
    },
    {
        id: "commercial",
        title: "Прибирання комерційних приміщень",
        text: "Магазини, салони, зали очікування — акуратно, швидко і за зручним для бізнесу графіком.",
        basePerSqm: 26,
        duration: "2–6 год",
        packageItems: [
            { id: "client-zone", label: "Зона для клієнтів і вітрини", defaultSelected: true, adjustment: 70 },
            { id: "floor", label: "Підлога, пил, сміття", defaultSelected: true, adjustment: 60 },
            { id: "restroom", label: "Санвузол і підсобні приміщення", defaultSelected: true, adjustment: 55 },
            { id: "display", label: "Протирання вітрин", defaultSelected: true, adjustment: 80 },
            { id: "storage", label: "Склад / підсобка", defaultSelected: false, adjustment: 200 },
            { id: "floor-machine", label: "Машинне миття підлоги", defaultSelected: false, adjustment: 300 },
        ],
    },
    {
        id: "office",
        title: "Прибирання офісів",
        text: "Чистий простір для команди — робочі місця, переговорні, кухня та санвузол.",
        basePerSqm: 22,
        duration: "2–5 год",
        packageItems: [
            { id: "desks", label: "Робочі столи та переговорні", defaultSelected: true, adjustment: 65 },
            { id: "kitchen", label: "Кухня, санвузол, коридори", defaultSelected: true, adjustment: 60 },
            { id: "floor", label: "Пилосос і миття підлоги", defaultSelected: true, adjustment: 50 },
            { id: "meeting", label: "Переговорні кімнати", defaultSelected: true, adjustment: 70 },
            { id: "coffee", label: "Кухня / кавова зона", defaultSelected: true, adjustment: 60 },
            { id: "appliances", label: "Мікрохвильовка та холодильник", defaultSelected: false, adjustment: 150 },
        ],
    },
    {
        id: "after-events",
        title: "Прибирання після свят або заходів",
        text: "Після вечірок, корпоративів чи сімейних свят — прибираємо без зайвого стресу.",
        basePerSqm: 32,
        duration: "3–8 год",
        packageItems: [
            { id: "general", label: "Прибирання після гостей і заходів", defaultSelected: true, adjustment: 80 },
            { id: "kitchen", label: "Кухня, посуд, поверхні", defaultSelected: true, adjustment: 70 },
            { id: "floor", label: "Підлога, сміття, запахи", defaultSelected: true, adjustment: 65 },
            { id: "dishes", label: "Миття посуду", defaultSelected: true, adjustment: 80 },
            { id: "furniture", label: "М'які меблі та текстиль", defaultSelected: true, adjustment: 100 },
            { id: "garbage", label: "Вивіз сміття", defaultSelected: false, adjustment: 200 },
            { id: "carpet", label: "Хімчистка коврів", defaultSelected: false, adjustment: 350 },
        ],
    },
] as const satisfies readonly FixedServiceCategory[];

type FixedServiceId = (typeof fixedServiceCategories)[number]["id"];

function isFixedServiceId(value: string | null): value is FixedServiceId {
    return value !== null && fixedServiceCategories.some((item) => item.id === value);
}

const businessServiceIds = new Set<FixedServiceId>(["commercial", "office", "after-events"]);

function isBusinessServiceId(id: FixedServiceId): boolean {
    return businessServiceIds.has(id);
}

const businessServiceCategories = fixedServiceCategories.filter((service) =>
    isBusinessServiceId(service.id),
);

const residentialServiceCategories = fixedServiceCategories.filter(
    (service) => !isBusinessServiceId(service.id),
);

const cleaningTimeSlots = [
    { id: "any", label: "Будь-який час" },
    { id: "morning", label: "08:00 – 12:00" },
    { id: "afternoon", label: "12:00 – 16:00" },
    { id: "evening", label: "16:00 – 20:00" },
] as const;

type CleaningTimeSlotId = (typeof cleaningTimeSlots)[number]["id"];

function getCleaningTimeSlotLabel(id: CleaningTimeSlotId | null) {
    if (!id) {
        return "Не обрано";
    }

    return cleaningTimeSlots.find((slot) => slot.id === id)?.label ?? id;
}

type CleaningTimeSlotSelectorProps = {
    value: CleaningTimeSlotId | null;
    onChange: (value: CleaningTimeSlotId) => void;
};

function CleaningTimeSlotSelector({ value, onChange }: CleaningTimeSlotSelectorProps) {
    const inputName = "cleaning-time-slot";

    return (
        <fieldset className="services-time-slots">
            <legend>Бажаний час прибирання</legend>
            <p className="services-time-slots-note">Працюємо щодня з 08:00 до 20:00</p>
            <div className="services-time-slots-grid" role="radiogroup" aria-label="Час прибирання">
                {cleaningTimeSlots.map((slot) => (
                    <label
                        key={slot.id}
                        className={`services-time-slot${
                            slot.id === "any" ? " services-time-slot--any" : ""
                        }${value === slot.id ? " services-time-slot--selected" : ""}`}
                    >
                        <input
                            type="radio"
                            name={inputName}
                            value={slot.id}
                            checked={value === slot.id}
                            onChange={() => onChange(slot.id)}
                        />
                        <span className="services-time-slot-label">{slot.label}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

function formatPrice(value: number) {
    return `${value.toLocaleString("uk-UA")} ₴`;
}

function getServiceCardPrice(service: FixedServiceCategory) {
    return service.flatPrice ?? service.basePerSqm ?? 0;
}

function formatFixedBaseBreakdown(
    service: Pick<FixedServiceCategory, "flatPrice" | "basePerSqm" | "sqmTierThreshold" | "sqmTierRate">,
    sqm: number,
) {
    if (service.flatPrice != null) {
        return formatPrice(service.flatPrice);
    }

    const rate = service.basePerSqm ?? 0;

    if (service.sqmTierThreshold != null && service.sqmTierRate != null && sqm > service.sqmTierThreshold) {
        const extraSqm = sqm - service.sqmTierThreshold;
        return `${formatPrice(rate)} × ${service.sqmTierThreshold} м² + ${formatPrice(service.sqmTierRate)} × ${extraSqm} м²`;
    }

    return `${formatPrice(rate)} × ${sqm} м²`;
}

function getCardPaymentTotal(total: number) {
    if (total <= 0) {
        return 0;
    }

    return Math.round(total * 0.9);
}

type PaymentMethod = "card" | "cash";

type OrderPaymentOptionsProps = {
    total: number;
    method: PaymentMethod;
    onMethodChange: (method: PaymentMethod) => void;
    onSubmit: () => void;
    error?: string;
    isSubmitting?: boolean;
    submitDisabled?: boolean;
};

function OrderPaymentOptions({
    total,
    method,
    onMethodChange,
    onSubmit,
    error,
    isSubmitting = false,
    submitDisabled = false,
}: OrderPaymentOptionsProps) {
    const cardTotal = getCardPaymentTotal(total);
    const inputName = `payment-${total}`;
    const submitLabel =
        method === "card" ? "Підтвердження оплати" : "Підтвердити замовлення";
    const submittingLabel =
        method === "card" ? "Переходимо до оплати…" : "Створюємо замовлення…";

    return (
        <div className="services-payment-options">
            <p className="services-payment-options-title">Спосіб оплати</p>

            <div className="services-payment-methods" role="radiogroup" aria-label="Спосіб оплати">
                <label
                    className={`services-payment-method${method === "card" ? " services-payment-method--selected" : ""}`}
                >
                    <input
                        type="radio"
                        name={inputName}
                        value="card"
                        checked={method === "card"}
                        onChange={() => onMethodChange("card")}
                    />
                    <span className="services-payment-method-dot" aria-hidden="true" />
                    <span className="services-payment-method-copy">
                        <span className="services-payment-method-label">Оплата картою</span>
                        <span className="services-payment-method-hint">Знижка 10% при оплаті картою</span>
                    </span>
                    <span className="services-payment-method-price">{formatPrice(cardTotal)}</span>
                </label>

                <label
                    className={`services-payment-method${method === "cash" ? " services-payment-method--selected" : ""}`}
                >
                    <input
                        type="radio"
                        name={inputName}
                        value="cash"
                        checked={method === "cash"}
                        onChange={() => onMethodChange("cash")}
                    />
                    <span className="services-payment-method-dot" aria-hidden="true" />
                    <span className="services-payment-method-copy">
                        <span className="services-payment-method-label">Оплата готівкою</span>
                    </span>
                    <span className="services-payment-method-price">{formatPrice(total)}</span>
                </label>
            </div>

            {error ? (
                <p className="services-payment-error-inline" role="alert">
                    {error}
                </p>
            ) : null}

            <button
                type="button"
                className="primary-button services-custom-cta"
                disabled={isSubmitting || submitDisabled}
                onClick={onSubmit}
            >
                {isSubmitting ? submittingLabel : submitLabel}
            </button>
        </div>
    );
}

type CustomExtrasSelectorProps = {
    quantities: Record<string, number>;
    onToggle: (extra: CustomExtraItem) => void;
    onQuantityChange: (id: string, value: string) => void;
};

function CustomExtrasSelector({ quantities, onToggle, onQuantityChange }: CustomExtrasSelectorProps) {
    const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
    const topSellerItems = useMemo(() => getTopSellerExtras(), []);

    function toggleCategory(categoryId: string) {
        setOpenCategoryId((current) => (current === categoryId ? null : categoryId));
    }

    function renderExtraItem(extra: CustomExtraItem) {
        const quantity = quantities[extra.id] ?? 0;
        const isSelected = quantity > 0;
        const usesQuantity = customExtraUsesQuantity(extra);

        return (
            <div key={extra.id} className="services-extra-row">
                <label className="services-extra-option">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggle(extra)}
                    />
                    <span className="services-extra-copy">
                        <span>{extra.label}</span>
                        <span className="services-extra-price">
                            {formatCustomExtraRate(extra)}
                            {extra.priceConfirmed ? (
                                <span
                                    className="services-extra-price-dot"
                                    title="Ціну вже задано"
                                    aria-label="Ціну вже задано"
                                />
                            ) : null}
                        </span>
                    </span>
                </label>
                {usesQuantity && isSelected ? (
                    <label className="services-extra-qty">
                        <span>{getCustomExtraQuantityLabel(extra)}</span>
                        <input
                            type="number"
                            min={1}
                            max={99}
                            value={quantity}
                            onChange={(event) => onQuantityChange(extra.id, event.target.value)}
                            inputMode="numeric"
                            aria-label={`${getCustomExtraQuantityLabel(extra)}: ${extra.label}`}
                        />
                    </label>
                ) : null}
            </div>
        );
    }

    function renderCategoryAccordion(categoryId: string, title: string, items: readonly CustomExtraItem[]) {
        const isOpen = openCategoryId === categoryId;
        const selectedCount = items.filter((extra) => (quantities[extra.id] ?? 0) > 0).length;

        return (
            <div
                key={categoryId}
                className={`services-extras services-extras--group services-extras-accordion${
                    isOpen ? " services-extras-accordion--open" : ""
                }`}
            >
                <button
                    type="button"
                    className="services-extras-accordion-trigger"
                    aria-expanded={isOpen}
                    onClick={() => toggleCategory(categoryId)}
                >
                    <span>{title}</span>
                    {selectedCount > 0 ? (
                        <span className="services-extras-accordion-badge">{selectedCount}</span>
                    ) : null}
                    <span className="services-extras-accordion-icon" aria-hidden="true" />
                </button>

                {isOpen ? (
                    <div className="services-extras-accordion-panel">
                        <div className="services-extras-grid">{items.map(renderExtraItem)}</div>
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div className="services-extras-categories">
            {renderCategoryAccordion("top-seller", "Топ продаж", topSellerItems)}
            {customExtraCategories.map((category) =>
                renderCategoryAccordion(category.id, category.title, category.items),
            )}
        </div>
    );
}

type AdditionalServicesSectionProps = CustomExtrasSelectorProps & {
    defaultOpen?: boolean;
    alwaysExpanded?: boolean;
};

function AdditionalServicesSection({
    quantities,
    onToggle,
    onQuantityChange,
    defaultOpen = false,
    alwaysExpanded = false,
}: AdditionalServicesSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen || alwaysExpanded);
    const selectedCount = useMemo(
        () => allOrderExtras.filter((extra) => (quantities[extra.id] ?? 0) > 0).length,
        [quantities],
    );

    if (alwaysExpanded) {
        return (
            <div className="services-extras-section services-extras-section--open services-extras-section--always-open">
                <div className="services-extras-section-heading">
                    <span>Додаткові послуги</span>
                    {selectedCount > 0 ? (
                        <span className="services-extras-section-badge">{selectedCount}</span>
                    ) : null}
                </div>
                <div className="services-extras-section-panel">
                    <CustomExtrasSelector
                        quantities={quantities}
                        onToggle={onToggle}
                        onQuantityChange={onQuantityChange}
                    />
                </div>
            </div>
        );
    }

    return (
        <div
            className={`services-extras-section${isOpen ? " services-extras-section--open" : ""}`}
        >
            <button
                type="button"
                className="services-extras-section-trigger"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((current) => !current)}
            >
                <span>Додаткові послуги</span>
                {selectedCount > 0 ? (
                    <span className="services-extras-section-badge">{selectedCount}</span>
                ) : null}
                <span className="services-extras-section-icon" aria-hidden="true" />
            </button>

            {isOpen ? (
                <div className="services-extras-section-panel">
                    <CustomExtrasSelector
                        quantities={quantities}
                        onToggle={onToggle}
                        onQuantityChange={onQuantityChange}
                    />
                </div>
            ) : null}
        </div>
    );
}

type OrganizationalChecksProps = {
    hasPets: boolean;
    ownSupplies: boolean;
    ownVacuum: boolean;
    onHasPetsChange: (value: boolean) => void;
    onOwnSuppliesChange: (value: boolean) => void;
    onOwnVacuumChange: (value: boolean) => void;
};

function OrganizationalChecks({
    hasPets,
    ownSupplies,
    ownVacuum,
    onHasPetsChange,
    onOwnSuppliesChange,
    onOwnVacuumChange,
}: OrganizationalChecksProps) {
    return (
        <div className="services-org-checks">
            <label className="services-extra-option services-extra-option--inline">
                <input
                    type="checkbox"
                    checked={hasPets}
                    onChange={(event) => onHasPetsChange(event.target.checked)}
                />
                <span className="services-extra-copy services-extra-copy--stack">
                    <span>Є домашні тварини</span>
                </span>
            </label>
            <label className="services-extra-option services-extra-option--inline">
                <input
                    type="checkbox"
                    checked={ownSupplies}
                    onChange={(event) => onOwnSuppliesChange(event.target.checked)}
                />
                <span className="services-extra-copy services-extra-copy--stack">
                    <span>Клієнт хоче власні засоби</span>
                    <span>Позначте, якщо прибиральниці мають користуватися засобами клієнта.</span>
                </span>
            </label>
            <label className="services-extra-option services-extra-option--inline">
                <input
                    type="checkbox"
                    checked={ownVacuum}
                    onChange={(event) => onOwnVacuumChange(event.target.checked)}
                />
                <span className="services-extra-copy services-extra-copy--stack">
                    <span>Є власний пилосос</span>
                    <span>Якщо так, майстрині можуть приїхати без нашого пилососа.</span>
                </span>
            </label>
        </div>
    );
}

function buildOrderPreferenceNote(options: {
    hasPets: boolean;
    ownSupplies: boolean;
    ownVacuum: boolean;
}) {
    return [
        `Домашні тварини: ${options.hasPets ? "так" : "ні"}`,
        `Клієнт просить прибирати його засобами: ${options.ownSupplies ? "так" : "ні"}`,
        `У клієнта є власний пилосос: ${
            options.ownVacuum ? "так, можна їхати без пилососа" : "ні"
        }`,
    ].join(". ");
}

function estimateFixedOrder(
    service: Pick<
        FixedServiceCategory,
        "flatPrice" | "basePerSqm" | "sqmTierThreshold" | "sqmTierRate"
    >,
    area: string,
    packageItems: readonly FixedPackageItem[],
    selectedAddons: string[],
    customExtrasTotal = 0,
) {
    const packageAddonsTotal = packageItems
        .filter((item) => !item.defaultSelected && selectedAddons.includes(item.id))
        .reduce((sum, item) => sum + item.adjustment, 0);
    const addedTotal = packageAddonsTotal + customExtrasTotal;

    if (service.flatPrice != null) {
        return {
            sqm: 0,
            base: service.flatPrice,
            packageAddonsTotal,
            customExtrasTotal,
            addedTotal,
            total: Math.round(service.flatPrice + addedTotal),
        };
    }

    const sqm = Math.max(20, Number.parseInt(area, 10) || 0);
    const rate = service.basePerSqm ?? 0;
    let base: number;

    if (service.sqmTierThreshold != null && service.sqmTierRate != null) {
        const firstTierSqm = Math.min(sqm, service.sqmTierThreshold);
        const extraSqm = Math.max(0, sqm - service.sqmTierThreshold);
        base = firstTierSqm * rate + extraSqm * service.sqmTierRate;
    } else {
        base = sqm * rate;
    }

    return {
        sqm,
        base,
        packageAddonsTotal,
        customExtrasTotal,
        addedTotal,
        total: Math.round(base + addedTotal),
    };
}

function parseCustomArea(area: string) {
    const trimmedArea = area.trim();
    if (!trimmedArea) {
        return null;
    }

    const parsedArea = Number.parseInt(trimmedArea, 10);
    if (Number.isNaN(parsedArea) || parsedArea <= 0) {
        return null;
    }

    return parsedArea;
}

function estimateCustomOrder(area: string, extraQuantities: Record<string, number>) {
    const sqm = parseCustomArea(area);
    const selectedExtras = allOrderExtras.filter((extra) => (extraQuantities[extra.id] ?? 0) > 0);
    const hasSelectedExtras = selectedExtras.length > 0;
    const needsArea = selectedExtras.some((extra) => (extra.priceUnit ?? "flat") === "sqm");

    if (!hasSelectedExtras) {
        return {
            sqm: sqm ?? 0,
            total: 0,
            extrasTotal: 0,
            isReady: false,
            hasSelectedExtras: false,
        };
    }

    if (needsArea && sqm === null) {
        return {
            sqm: 0,
            total: 0,
            extrasTotal: 0,
            isReady: false,
            hasSelectedExtras: true,
        };
    }

    const effectiveSqm = sqm ?? 0;
    const extrasTotal = selectedExtras.reduce(
        (sum, extra) =>
            sum + calculateCustomExtraTotal(extra, effectiveSqm, extraQuantities[extra.id] ?? 1),
        0,
    );

    return {
        sqm: effectiveSqm,
        total: Math.round(extrasTotal),
        extrasTotal: Math.round(extrasTotal),
        isReady: true,
        hasSelectedExtras: true,
    };
}

function getPackageItemGroups(items: readonly FixedPackageItem[]) {
    const order: string[] = [];
    const map = new Map<string, FixedPackageItem[]>();

    for (const item of items) {
        const key = item.group ?? "";
        if (!map.has(key)) {
            map.set(key, []);
            order.push(key);
        }
        map.get(key)!.push(item);
    }

    return order.map((key) => ({
        title: key || null,
        items: map.get(key)!,
    }));
}

type SubscriptionCycleCalendarProps = {
    visitDays: number[];
    onToggleDay: (day: number) => void;
    onClear: () => void;
    onSelectAll: () => void;
};

function getSubscriptionDayLabel(day: number) {
    if (day === 1) {
        return "сьогодні";
    }

    if (day === 2) {
        return "завтра";
    }

    return null;
}

function SubscriptionCycleCalendar({
    visitDays,
    onToggleDay,
    onClear,
    onSelectAll,
}: SubscriptionCycleCalendarProps) {
    const activeDays = new Set(visitDays);

    return (
        <div className="services-subscription-calendar-wrap">
            <div className="services-subscription-calendar-head">
                <p className="services-subscription-calendar-title">
                    Графік на {SUBSCRIPTION_CYCLE_DAYS} днів — натисни на день, щоб увімкнути або вимкнути
                </p>
                <div className="services-subscription-calendar-tools">
                    <button type="button" className="secondary-button compact" onClick={onSelectAll}>
                        Усі дні
                    </button>
                    <button type="button" className="secondary-button compact" onClick={onClear}>
                        Очистити
                    </button>
                </div>
            </div>
            <div className="services-subscription-calendar" role="group" aria-label="Дні візитів у циклі">
                {Array.from({ length: SUBSCRIPTION_CYCLE_DAYS }, (_, index) => {
                    const day = index + 1;
                    const isActive = activeDays.has(day);
                    const label = getSubscriptionDayLabel(day);

                    return (
                        <button
                            key={day}
                            type="button"
                            aria-pressed={isActive}
                            aria-label={
                                label
                                    ? `${label}, день ${day}${isActive ? ", обрано" : ""}`
                                    : `День ${day}${isActive ? ", обрано" : ""}`
                            }
                            className={`services-subscription-calendar-day${
                                label ? " services-subscription-calendar-day--labeled" : ""
                            }${isActive ? " services-subscription-calendar-day--active" : ""}`}
                            onClick={() => onToggleDay(day)}
                        >
                            <span className="services-subscription-calendar-day-value">{day}</span>
                            {label ? (
                                <span className="services-subscription-calendar-day-label">{label}</span>
                            ) : null}
                        </button>
                    );
                })}
            </div>
            {visitDays.length > 0 ? (
                <>
                    <p className="services-subscription-calendar-caption">{describeVisitDayRanges(visitDays)}</p>
                    <p className="services-subscription-calendar-caption services-subscription-calendar-caption--muted">
                        {formatVisitDaysSummary(visitDays)}
                    </p>
                </>
            ) : (
                <p className="services-subscription-calendar-caption services-subscription-calendar-caption--muted">
                    Поки немає обраних днів — клікни по календарю.
                </p>
            )}
        </div>
    );
}

export default function ServicesPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const paymentSuccess = searchParams.get("paid") === "1";
    const fixedPanelRef = useRef<HTMLDivElement>(null);
    const servicesTopRef = useRef<HTMLDivElement>(null);
    const previousServiceRef = useRef<string | null>(null);

    const activeTab = parseServiceTab(searchParams.get("tab"));
    const serviceParam = searchParams.get("service");
    const selectedFixedService =
        activeTab === "fixed" && isFixedServiceId(serviceParam)
            ? serviceParam
            : activeTab === "business" &&
                isFixedServiceId(serviceParam) &&
                isBusinessServiceId(serviceParam)
              ? serviceParam
              : null;
    const isPackageTab = activeTab === "fixed" || activeTab === "business";
    const packageServiceCategories =
        activeTab === "business" ? businessServiceCategories : residentialServiceCategories;
    const [isPaying, setIsPaying] = useState(false);
    const [paymentError, setPaymentError] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
    const [cleaningTimeSlot, setCleaningTimeSlot] = useState<CleaningTimeSlotId | null>(null);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [checkoutError, setCheckoutError] = useState("");

    const [fixedArea, setFixedArea] = useState("55");
    const [fixedSelectedAddons, setFixedSelectedAddons] = useState<string[]>([]);
    const [fixedExtraQuantities, setFixedExtraQuantities] = useState<Record<string, number>>({});
    const [fixedHasPets, setFixedHasPets] = useState(false);
    const [fixedOwnSupplies, setFixedOwnSupplies] = useState(false);
    const [fixedOwnVacuum, setFixedOwnVacuum] = useState(false);
    const [fixedNotes, setFixedNotes] = useState("");

    const [cleaningType, setCleaningType] = useState<(typeof customCleaningTypes)[number]["id"]>("regular");
    const [area, setArea] = useState("");
    const [extraQuantities, setExtraQuantities] = useState<Record<string, number>>({});
    const [notes, setNotes] = useState("");
    const [propertyType, setPropertyType] = useState<(typeof propertyTypeOptions)[number]["id"]>("apartment");
    const [pollutionLevel, setPollutionLevel] = useState<(typeof pollutionLevelOptions)[number]["id"]>("light");
    const [hasPets, setHasPets] = useState(false);
    const [ownSupplies, setOwnSupplies] = useState(false);
    const [ownVacuum, setOwnVacuum] = useState(false);
    const [cleanersCount, setCleanersCount] = useState("1");

    const [subscriptionVisitDays, setSubscriptionVisitDays] = useState<number[]>([]);
    const [subscriptionAutoPay, setSubscriptionAutoPay] = useState(true);
    const [subscriptionArea, setSubscriptionArea] = useState("");
    const [subscriptionExtraQuantities, setSubscriptionExtraQuantities] = useState<Record<string, number>>({});
    const [subscriptionNotes, setSubscriptionNotes] = useState("");

    const [savedAddresses, setSavedAddresses] = useState<UserAddressDto[]>([]);
    const [addressesLoading, setAddressesLoading] = useState(false);
    const [addressSelection, setAddressSelection] = useState("new");
    const [customAddress, setCustomAddress] = useState("");

    const selectedService = fixedServiceCategories.find((item) => item.id === selectedFixedService);

    const fixedEstimate = useMemo(() => {
        if (!selectedService) {
            return null;
        }

        const sqmForExtras = Math.max(20, Number.parseInt(fixedArea, 10) || 0);
        const customExtrasTotal = allOrderExtras
            .filter((extra) => (fixedExtraQuantities[extra.id] ?? 0) > 0)
            .reduce(
                (sum, extra) =>
                    sum +
                    calculateCustomExtraTotal(
                        extra,
                        sqmForExtras,
                        fixedExtraQuantities[extra.id] ?? 1,
                    ),
                0,
            );

        return estimateFixedOrder(
            selectedService,
            fixedArea,
            selectedService.packageItems,
            fixedSelectedAddons,
            customExtrasTotal,
        );
    }, [fixedArea, fixedExtraQuantities, fixedSelectedAddons, selectedService]);

    const customEstimate = useMemo(() => {
        const type = customCleaningTypes.find((item) => item.id === cleaningType) ?? customCleaningTypes[0];
        const result = estimateCustomOrder(area, extraQuantities);

        return {
            ...result,
            typeLabel: type.label,
        };
    }, [area, cleaningType, extraQuantities]);

    const subscriptionEstimate = useMemo(
        () => estimateSubscriptionOrder(subscriptionArea, subscriptionExtraQuantities, subscriptionVisitDays),
        [subscriptionArea, subscriptionExtraQuantities, subscriptionVisitDays],
    );

    function toggleSubscriptionVisitDay(day: number) {
        setSubscriptionVisitDays((current) => {
            if (current.includes(day)) {
                return current.filter((value) => value !== day);
            }

            return normalizeVisitDays([...current, day]);
        });
    }

    useEffect(() => {
        if (!user || user.role !== "User") {
            setSavedAddresses([]);
            setAddressSelection("new");
            setCustomAddress("");
            return;
        }

        let cancelled = false;
        const currentUser = user;

        async function loadAddresses() {
            setAddressesLoading(true);

            try {
                const result = await fetchProfile(currentUser.id);
                if (cancelled) {
                    return;
                }

                if (!result.success || !result.profile) {
                    setSavedAddresses([]);
                    setAddressSelection("new");
                    return;
                }

                const addresses = result.profile.addresses;
                setSavedAddresses(addresses);

                const preferredAddress = addresses[0];
                if (preferredAddress) {
                    setAddressSelection(preferredAddress.id);
                    setCustomAddress("");
                } else {
                    setAddressSelection("new");
                }
            } catch {
                if (!cancelled) {
                    setSavedAddresses([]);
                    setAddressSelection("new");
                }
            } finally {
                if (!cancelled) {
                    setAddressesLoading(false);
                }
            }
        }

        void loadAddresses();

        return () => {
            cancelled = true;
        };
    }, [user]);

    useEffect(() => {
        if (serviceParam && selectedFixedService) {
            window.requestAnimationFrame(() => {
                scrollToServicesSection(fixedPanelRef.current);
            });
        } else if (previousServiceRef.current && !serviceParam) {
            window.requestAnimationFrame(() => {
                scrollToServicesSection(servicesTopRef.current);
            });
        }

        previousServiceRef.current = serviceParam;
    }, [serviceParam, selectedFixedService]);

    useEffect(() => {
        const state = location.state as { scrollServicesTop?: boolean } | null;
        if (!state?.scrollServicesTop) {
            return;
        }

        window.requestAnimationFrame(() => {
            scrollToServicesSection(servicesTopRef.current);
        });

        navigate(
            { pathname: location.pathname, search: location.search },
            { replace: true, state: null },
        );
    }, [location.pathname, location.search, location.state, navigate]);

    function getOrderAddressFields() {
        return buildOrderAddressFields(addressSelection, customAddress);
    }

    function validateOrderAddress(): string | null {
        const fields = getOrderAddressFields();
        if (!fields) {
            return "Вкажіть адресу прибирання.";
        }

        if (fields.address) {
            return validateServiceAreaAddress(fields.address);
        }

        return null;
    }

    function validateCleaningTimeSlot(): string | null {
        if (!cleaningTimeSlot) {
            return "Оберіть бажаний час прибирання.";
        }

        return null;
    }

    function toggleExtra(extra: CustomExtraItem) {
        setExtraQuantities((current) => {
            if ((current[extra.id] ?? 0) > 0) {
                const next = { ...current };
                delete next[extra.id];
                return next;
            }

            return { ...current, [extra.id]: 1 };
        });
    }

    function setExtraQuantity(id: string, rawValue: string) {
        const parsed = Number.parseInt(rawValue, 10);
        if (!Number.isFinite(parsed) || parsed < 1) {
            setExtraQuantities((current) => {
                const next = { ...current };
                delete next[id];
                return next;
            });
            return;
        }

        setExtraQuantities((current) => ({
            ...current,
            [id]: Math.min(99, parsed),
        }));
    }

    function toggleSubscriptionExtra(extra: CustomExtraItem) {
        setSubscriptionExtraQuantities((current) => {
            if ((current[extra.id] ?? 0) > 0) {
                const next = { ...current };
                delete next[extra.id];
                return next;
            }

            return { ...current, [extra.id]: 1 };
        });
    }

    function setSubscriptionExtraQuantity(id: string, rawValue: string) {
        const parsed = Number.parseInt(rawValue, 10);
        if (!Number.isFinite(parsed) || parsed < 1) {
            setSubscriptionExtraQuantities((current) => {
                const next = { ...current };
                delete next[id];
                return next;
            });
            return;
        }

        setSubscriptionExtraQuantities((current) => ({
            ...current,
            [id]: Math.min(99, parsed),
        }));
    }

    function toggleFixedExtra(extra: CustomExtraItem) {
        setFixedExtraQuantities((current) => {
            if ((current[extra.id] ?? 0) > 0) {
                const next = { ...current };
                delete next[extra.id];
                return next;
            }

            return { ...current, [extra.id]: 1 };
        });
    }

    function setFixedExtraQuantity(id: string, rawValue: string) {
        const parsed = Number.parseInt(rawValue, 10);
        if (!Number.isFinite(parsed) || parsed < 1) {
            setFixedExtraQuantities((current) => {
                const next = { ...current };
                delete next[id];
                return next;
            });
            return;
        }

        setFixedExtraQuantities((current) => ({
            ...current,
            [id]: Math.min(99, parsed),
        }));
    }

    function openFixedService(id: FixedServiceId) {
        const service = fixedServiceCategories.find((item) => item.id === id);
        if (!service) {
            return;
        }

        setFixedArea("55");
        setFixedSelectedAddons([]);
        setFixedExtraQuantities({});
        setFixedHasPets(false);
        setFixedOwnSupplies(false);
        setFixedOwnVacuum(false);
        setFixedNotes("");
        setPaymentError("");
        setPaymentMethod("card");
        setCleaningTimeSlot(null);
        setCheckoutError("");

        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set("tab", activeTab === "business" ? "business" : "fixed");
            next.set("service", id);
            return next;
        });
    }

    function requireAuthForCheckout() {
        if (user) {
            return true;
        }

        navigate(`/login?returnTo=${encodeURIComponent("/services")}`);
        return false;
    }

    function handlePaymentSubmit() {
        if (!requireAuthForCheckout()) {
            return;
        }

        if (user?.role !== "User") {
            const message = "Замовлення можуть оформлювати лише клієнти. Увійдіть під звичайним акаунтом.";
            setPaymentError(message);
            setCheckoutError(message);
            return;
        }

        setPaymentError("");
        setCheckoutError("");
        confirmCheckoutOrder();
    }

    function buildFixedOrderDescription() {
        if (!selectedService || !fixedEstimate) {
            return "";
        }

        const servicePart =
            selectedService.flatPrice != null
                ? selectedService.title
                : `${selectedService.title} — ${fixedEstimate.sqm} м²`;

        return `${servicePart}, ${getCleaningTimeSlotLabel(cleaningTimeSlot)}`;
    }

    async function submitFixedOrder() {
        if (!user || !selectedService || !fixedEstimate) {
            return;
        }

        setIsSubmittingOrder(true);
        setPaymentError("");
        setCheckoutError("");

        const addressError = validateOrderAddress();
        if (addressError) {
            setCheckoutError(addressError);
            setPaymentError(addressError);
            setIsSubmittingOrder(false);
            return;
        }

        const timeSlotError = validateCleaningTimeSlot();
        if (timeSlotError) {
            setCheckoutError(timeSlotError);
            setPaymentError(timeSlotError);
            setIsSubmittingOrder(false);
            return;
        }

        const addressFields = getOrderAddressFields()!;
        const selectedTimeSlot = cleaningTimeSlot!;

        const selectedPackageAddonLabels = selectedService.packageItems
            .filter((item) => !item.defaultSelected && fixedSelectedAddons.includes(item.id))
            .map((item) => item.label);
        const selectedCustomExtraLabels = getSelectedCustomExtraLabels(fixedExtraQuantities);
        const organizationalNote = buildOrderPreferenceNote({
            hasPets: fixedHasPets,
            ownSupplies: fixedOwnSupplies,
            ownVacuum: fixedOwnVacuum,
        });
        const combinedNotes = [organizationalNote, fixedNotes.trim()].filter(Boolean).join("\n\n");

        const orderPayload = {
            userId: user.id,
            serviceId: selectedService.id,
            serviceTitle: selectedService.title,
            orderType: "fixed" as const,
            areaSqm: selectedService.flatPrice != null ? undefined : fixedEstimate.sqm,
            selectedAddons: [...selectedPackageAddonLabels, ...selectedCustomExtraLabels],
            timeSlot: selectedTimeSlot,
            timeSlotLabel: getCleaningTimeSlotLabel(selectedTimeSlot),
            notes: combinedNotes || undefined,
            ...addressFields,
            paymentMethod,
            totalAmount: fixedEstimate.total,
            payableAmount:
                paymentMethod === "card"
                    ? getCardPaymentTotal(fixedEstimate.total)
                    : fixedEstimate.total,
        };

        try {
            if (paymentMethod === "card") {
                await startCardPayment({
                    ...orderPayload,
                    paymentMethod: "card",
                    paymentReference: crypto.randomUUID(),
                    description: buildFixedOrderDescription(),
                });
                return;
            }

            const result = await createOrder(orderPayload);

            if (!result.success || !result.order) {
                const message = result.errors?.[0] ?? "Не вдалося створити замовлення.";
                setCheckoutError(message);
                setPaymentError(message);
                return;
            }

            navigate("/profile/orders");
        } catch {
            const message = "Помилка з'єднання з сервером. Перевірте, чи запущений backend.";
            setCheckoutError(message);
            setPaymentError(message);
        } finally {
            setIsSubmittingOrder(false);
        }
    }

    async function submitCustomOrder() {
        if (!user) {
            return;
        }

        setIsSubmittingOrder(true);
        setPaymentError("");
        setCheckoutError("");

        const addressError = validateOrderAddress();
        if (addressError) {
            setCheckoutError(addressError);
            setPaymentError(addressError);
            setIsSubmittingOrder(false);
            return;
        }

        const timeSlotError = validateCleaningTimeSlot();
        if (timeSlotError) {
            setCheckoutError(timeSlotError);
            setPaymentError(timeSlotError);
            setIsSubmittingOrder(false);
            return;
        }

        if (!customEstimate.hasSelectedExtras) {
            const message = "Оберіть послуги з розділу «Додаткові послуги».";
            setCheckoutError(message);
            setPaymentError(message);
            setIsSubmittingOrder(false);
            return;
        }

        if (!customEstimate.isReady) {
            const message = "Вкажіть площу для розрахунку вартості.";
            setCheckoutError(message);
            setPaymentError(message);
            setIsSubmittingOrder(false);
            return;
        }

        if (customEstimate.total < MIN_CUSTOM_ORDER_TOTAL) {
            const message = `Мінімальна сума замовлення — ${formatPrice(MIN_CUSTOM_ORDER_TOTAL)}.`;
            setCheckoutError(message);
            setPaymentError(message);
            setIsSubmittingOrder(false);
            return;
        }

        const addressFields = getOrderAddressFields()!;
        const selectedTimeSlot = cleaningTimeSlot!;

        const selectedAddonLabels = getSelectedCustomExtraLabels(extraQuantities);

        const organizationalNote = buildCustomOrganizationalNote({
            propertyType,
            pollutionLevel,
            hasPets,
            ownSupplies,
            ownVacuum,
            cleanersCount,
        });

        const combinedNotes = [organizationalNote, notes.trim()].filter(Boolean).join("\n\n");

        const orderPayload = {
            userId: user.id,
            serviceId: cleaningType,
            serviceTitle: customEstimate.typeLabel,
            orderType: "custom" as const,
            areaSqm: customEstimate.sqm,
            selectedAddons: selectedAddonLabels,
            timeSlot: selectedTimeSlot,
            timeSlotLabel: getCleaningTimeSlotLabel(selectedTimeSlot),
            notes: combinedNotes || undefined,
            ...addressFields,
            paymentMethod,
            totalAmount: customEstimate.total,
            payableAmount:
                paymentMethod === "card"
                    ? getCardPaymentTotal(customEstimate.total)
                    : customEstimate.total,
        };

        try {
            if (paymentMethod === "card") {
                await startCardPayment({
                    ...orderPayload,
                    paymentMethod: "card",
                    paymentReference: crypto.randomUUID(),
                    description: `${customEstimate.typeLabel} — ${customEstimate.sqm} м², ${getCleaningTimeSlotLabel(selectedTimeSlot)}`,
                });
                return;
            }

            const result = await createOrder(orderPayload);

            if (!result.success || !result.order) {
                const message = result.errors?.[0] ?? "Не вдалося створити замовлення.";
                setCheckoutError(message);
                setPaymentError(message);
                return;
            }

            navigate("/profile/orders");
        } catch {
            const message = "Помилка з'єднання з сервером. Перевірте, чи запущений backend.";
            setCheckoutError(message);
            setPaymentError(message);
        } finally {
            setIsSubmittingOrder(false);
        }
    }

    async function startCardPayment(
        pending: Omit<PendingOrderPayload, "invoiceId">,
    ): Promise<boolean> {
        setPaymentError("");
        setCheckoutError("");
        setIsPaying(true);

        try {
            const { paymentReference, description, ...orderPayload } = pending;

            const result = await createMonoInvoice({
                amountKopiyky: Math.round(pending.payableAmount * 100),
                destination: description,
                reference: paymentReference,
                pendingOrder: orderPayload,
            });

            if (!result.success || !result.pageUrl || !result.invoiceId) {
                const message = result.error ?? "Не вдалося створити рахунок Monobank.";
                setCheckoutError(message);
                setPaymentError(message);
                return false;
            }

            savePendingOrder({
                ...pending,
                invoiceId: result.invoiceId,
            });

            window.location.assign(result.pageUrl);
            return true;
        } catch {
            const message = "Помилка з'єднання з сервером. Перевірте, чи запущений backend.";
            setCheckoutError(message);
            setPaymentError(message);
            return false;
        } finally {
            setIsPaying(false);
        }
    }

    function closeFixedService() {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.delete("service");
            next.set("tab", activeTab === "business" ? "business" : "fixed");
            return next;
        });
        setCheckoutError("");
    }

    function switchTab(tab: Exclude<ServiceTab, "subscription">) {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set("tab", tab);
            next.delete("service");
            return next;
        });
        setCheckoutError("");
        window.requestAnimationFrame(() => {
            scrollToServicesSection(servicesTopRef.current);
        });
    }

    function confirmCheckoutOrder() {
        if (isPackageTab) {
            void submitFixedOrder();
            return;
        }

        void submitCustomOrder();
    }

    return (
        <div className="services-page">
            <div ref={servicesTopRef} className="services-page-anchor" aria-hidden="true" />
            {paymentSuccess ? (
                <div className="services-payment-banner hero-panel" role="status">
                    <p>Оплату отримано. Дякуємо!</p>
                    <button
                        type="button"
                        className="services-back"
                        onClick={() => setSearchParams({})}
                    >
                        Закрити
                    </button>
                </div>
            ) : null}

            {paymentError ? (
                <div className="services-payment-error hero-panel" role="alert">
                    {paymentError}
                </div>
            ) : null}

            <div className="services-tabs-wrap">
                <div
                    className={`services-tabs services-tabs--${activeTab}`}
                    role="tablist"
                    aria-label="Тип послуг"
                >
                    <span className="services-tabs-indicator" aria-hidden="true" />
                    <button
                        type="button"
                        role="tab"
                        id="services-tab-fixed"
                        aria-selected={activeTab === "fixed"}
                        aria-controls="services-panel-fixed"
                        className={`services-tab${activeTab === "fixed" ? " services-tab--active" : ""}`}
                        onClick={() => switchTab("fixed")}
                    >
                        <span className="services-tab-label services-tab-label--full">Фіксовані пакети</span>
                        <span className="services-tab-label services-tab-label--short">Фіксовані</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        id="services-tab-custom"
                        aria-selected={activeTab === "custom"}
                        aria-controls="services-panel-custom"
                        className={`services-tab${activeTab === "custom" ? " services-tab--active" : ""}`}
                        onClick={() => switchTab("custom")}
                    >
                        <span className="services-tab-label services-tab-label--full">Кастомне прибирання</span>
                        <span className="services-tab-label services-tab-label--short">Кастомне</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        id="services-tab-business"
                        aria-selected={activeTab === "business"}
                        aria-controls="services-panel-business"
                        className={`services-tab${activeTab === "business" ? " services-tab--active" : ""}`}
                        onClick={() => switchTab("business")}
                    >
                        <span className="services-tab-label services-tab-label--full">Для бізнесу</span>
                        <span className="services-tab-label services-tab-label--short">Бізнес</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        id="services-tab-subscription"
                        aria-label="Прибирання по підписці наразі недоступне"
                        aria-selected={false}
                        aria-disabled="true"
                        aria-controls="services-panel-subscription"
                        className="services-tab services-tab--disabled"
                        disabled
                        title="Прибирання по підписці скоро буде доступне"
                    >
                        <span className="services-tab-label services-tab-label--full">Прибирання по підписці</span>
                        <span className="services-tab-label services-tab-label--short">Підписка</span>
                        <span className="services-tab-soon">Скоро</span>
                    </button>
                </div>
            </div>

            {isPackageTab && (
                <div
                    ref={fixedPanelRef}
                    id={activeTab === "business" ? "services-panel-business" : "services-panel-fixed"}
                    role="tabpanel"
                    aria-labelledby={
                        activeTab === "business" ? "services-tab-business" : "services-tab-fixed"
                    }
                    className="services-panel"
                >
                    {selectedService && fixedEstimate ? (
                        <>
                            <div className="services-fixed-head">
                                <button type="button" className="services-back" onClick={closeFixedService}>
                                    ← Усі послуги
                                </button>
                            </div>

                            <div className="services-custom">
                                <form
                                    className="services-custom-form hero-panel"
                                    onSubmit={(event) => event.preventDefault()}
                                >
                                    <h2 className="services-custom-title">{selectedService.title}</h2>
                                    <p className="services-category-desc">{selectedService.text}</p>

                                    <fieldset className="services-package-included">
                                        <legend className="services-package-included-legend">
                                            <span className="services-package-included-legend-title">
                                                В пакеті
                                            </span>
                                            <span className="services-package-included-legend-badge">
                                                {
                                                    selectedService.packageItems.filter(
                                                        (item) => item.defaultSelected,
                                                    ).length
                                                }{" "}
                                                послуг
                                            </span>
                                        </legend>
                                        <p className="services-package-included-note">
                                            Вже включено у вартість — окремо не оплачуються
                                        </p>
                                        <div className="services-package-included-groups">
                                            {getPackageItemGroups(
                                                selectedService.packageItems.filter((item) => item.defaultSelected),
                                            ).map((section) => (
                                                <div
                                                    key={section.title ?? "default"}
                                                    className="services-package-included-group"
                                                >
                                                    {section.title ? (
                                                        <p className="services-package-included-group-title">
                                                            {section.title}
                                                        </p>
                                                    ) : null}
                                                    <ul className="services-package-included-list">
                                                        {section.items.map((item) => (
                                                            <li
                                                                key={item.id}
                                                                className="services-package-included-chip"
                                                            >
                                                                {item.label}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </fieldset>

                                    <div className="services-order-params">
                                        <label className="services-field services-order-area">
                                            <span>Площа, м²</span>
                                            <input
                                                type="number"
                                                min={20}
                                                max={500}
                                                value={fixedArea}
                                                onChange={(event) => setFixedArea(event.target.value)}
                                                inputMode="numeric"
                                            />
                                        </label>

                                        <div className="services-order-rate">
                                            <span className="services-order-rate-label">Базова ціна</span>
                                            {selectedService.flatPrice != null ? (
                                                <p className="services-order-rate-main">
                                                    {formatPrice(selectedService.flatPrice)}
                                                    <span> фікс.</span>
                                                </p>
                                            ) : selectedService.sqmTierThreshold != null &&
                                              selectedService.sqmTierRate != null ? (
                                                <>
                                                    <p className="services-order-rate-main">
                                                        {formatPrice(selectedService.sqmTierRate)}
                                                        <span> / м²</span>
                                                    </p>
                                                    <p className="services-order-rate-note">
                                                        {formatPrice(selectedService.basePerSqm ?? 0)} / м² для
                                                        перших {selectedService.sqmTierThreshold} м²
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="services-order-rate-main">
                                                    {formatPrice(selectedService.basePerSqm ?? 0)}
                                                    <span> / м²</span>
                                                </p>
                                            )}
                                            {selectedService.flatPrice != null ? (
                                                <p className="services-order-rate-note">
                                                    для розрахунку додаткових послуг
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>

                                    <fieldset className="services-extras services-extras--org">
                                        <legend>Організаційні опції</legend>
                                        <OrganizationalChecks
                                            hasPets={fixedHasPets}
                                            ownSupplies={fixedOwnSupplies}
                                            ownVacuum={fixedOwnVacuum}
                                            onHasPetsChange={setFixedHasPets}
                                            onOwnSuppliesChange={setFixedOwnSupplies}
                                            onOwnVacuumChange={setFixedOwnVacuum}
                                        />
                                    </fieldset>

                                    <AdditionalServicesSection
                                        quantities={fixedExtraQuantities}
                                        onToggle={toggleFixedExtra}
                                        onQuantityChange={setFixedExtraQuantity}
                                    />

                                    <OrderAddressSelector
                                        addresses={savedAddresses}
                                        selection={addressSelection}
                                        onSelectionChange={setAddressSelection}
                                        customAddress={customAddress}
                                        onCustomAddressChange={setCustomAddress}
                                        loading={addressesLoading}
                                    />

                                    <CleaningTimeSlotSelector
                                        value={cleaningTimeSlot}
                                        onChange={setCleaningTimeSlot}
                                    />

                                    <label className="services-field services-field--comment">
                                        <span>Коментар</span>
                                        <AutoResizeTextarea
                                            className="services-comment-field"
                                            placeholder="Доступ до приміщення, особливі побажання..."
                                            value={fixedNotes}
                                            onChange={(event) => setFixedNotes(event.target.value)}
                                        />
                                    </label>
                                </form>

                                <aside className="services-custom-summary hero-panel" aria-live="polite">
                                    <span className="badge hero-badge">Орієнтовна вартість</span>
                                    <p className="services-custom-price">
                                        {formatPrice(
                                            paymentMethod === "card"
                                                ? getCardPaymentTotal(fixedEstimate.total)
                                                : fixedEstimate.total,
                                        )}
                                    </p>
                                    {paymentMethod === "card" ? (
                                        <p className="services-custom-discount-note">
                                            Зі знижкою 10% при оплаті картою
                                        </p>
                                    ) : null}
                                    <p className="services-custom-note">
                                        Точну суму підтвердимо перед виїздом після короткої консультації.
                                    </p>

                                    <ul className="services-custom-breakdown">
                                        <li>
                                            <span>Послуга</span>
                                            <span>{selectedService.title}</span>
                                        </li>
                                        <li>
                                            <span>База</span>
                                            <span>
                                                {formatFixedBaseBreakdown(selectedService, fixedEstimate.sqm)}
                                            </span>
                                        </li>
                                        {fixedEstimate.packageAddonsTotal > 0 ? (
                                            <li>
                                                <span>Опції пакета</span>
                                                <span>+{formatPrice(fixedEstimate.packageAddonsTotal)}</span>
                                            </li>
                                        ) : null}
                                        {fixedEstimate.customExtrasTotal > 0 ? (
                                            <>
                                                {getSelectedCustomExtraLabels(fixedExtraQuantities).map(
                                                    (label) => (
                                                        <li key={label}>
                                                            <span>{label}</span>
                                                            <span aria-hidden="true">✓</span>
                                                        </li>
                                                    ),
                                                )}
                                                <li>
                                                    <span>Додаткові послуги</span>
                                                    <span>
                                                        +{formatPrice(fixedEstimate.customExtrasTotal)}
                                                    </span>
                                                </li>
                                            </>
                                        ) : null}
                                        <li>
                                            <span>Час</span>
                                            <span>{getCleaningTimeSlotLabel(cleaningTimeSlot)}</span>
                                        </li>
                                    </ul>

                                    <OrderPaymentOptions
                                        total={fixedEstimate.total}
                                        method={paymentMethod}
                                        onMethodChange={setPaymentMethod}
                                        onSubmit={handlePaymentSubmit}
                                        error={checkoutError}
                                        isSubmitting={isSubmittingOrder || isPaying}
                                    />
                                </aside>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="services-panel-lead">
                                {activeTab === "business"
                                    ? "Офіси, комерційні приміщення та прибирання після заходів — оберіть послугу та розрахуйте вартість."
                                    : "Оберіть тип прибирання — натисніть «Переглянути склад пакета», щоб побачити деталі, або «Розрахувати вартість», щоб оформити замовлення."}
                            </p>

                            <div className="services-grid services-grid--categories">
                                {packageServiceCategories.map((service) => (
                                    <article key={service.id} className="services-card services-card--category hero-panel">
                                        <div className="services-category-head">
                                            <h2 className="services-card-title">{service.title}</h2>
                                            <p
                                                className={`services-category-price${
                                                    service.sqmTierThreshold != null && service.sqmTierRate != null
                                                        ? " services-category-price--tiered"
                                                        : ""
                                                }`}
                                            >
                                                {service.flatPrice != null ? (
                                                    <>
                                                        <span className="services-category-price-amount">
                                                            {formatPrice(service.flatPrice)}
                                                        </span>
                                                        <span className="services-category-price-unit">фікс.</span>
                                                    </>
                                                ) : service.sqmTierThreshold != null && service.sqmTierRate != null ? (
                                                    <>
                                                        <span className="services-category-price-main">
                                                            <span className="services-category-price-amount services-category-price-amount--accent">
                                                                {formatPrice(service.sqmTierRate)}
                                                            </span>
                                                            <span className="services-category-price-unit services-category-price-unit--accent">
                                                                / м²
                                                            </span>
                                                        </span>
                                                        <span className="services-category-price-tier">
                                                            {formatPrice(service.basePerSqm ?? 0)} до{" "}
                                                            {service.sqmTierThreshold} м², далі
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="services-category-price-amount">
                                                            {formatPrice(getServiceCardPrice(service))}
                                                        </span>
                                                        <span className="services-category-price-unit">/ м²</span>
                                                    </>
                                                )}
                                            </p>
                                        </div>

                                        <p className="services-card-text">{service.text}</p>

                                        <button
                                            type="button"
                                            className="services-package-link"
                                            onClick={() => openFixedService(service.id)}
                                        >
                                            Переглянути склад пакета
                                        </button>

                                        <div className="services-category-foot">
                                            <div className="services-category-duration">
                                                <span className="services-meta-label">Орієнтовний час</span>
                                                <span className="services-meta-value">{service.duration}</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="primary-button compact services-category-cta"
                                                onClick={() => openFixedService(service.id)}
                                            >
                                                Розрахувати вартість
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === "custom" && (
                <div
                    id="services-panel-custom"
                    role="tabpanel"
                    aria-labelledby="services-tab-custom"
                    className="services-panel"
                >
                    <p className="services-panel-lead">
                        Зберіть замовлення під ваше приміщення — оберіть тип, параметри, роботи зі списку та
                        додаткові опції. Орієнтовну вартість побачите одразу.
                    </p>

                    <div className="services-custom">
                        <form
                            className="services-custom-form hero-panel"
                            onSubmit={(event) => event.preventDefault()}
                        >
                            <h2 className="services-custom-title">Деталі замовлення</h2>

                            <label className="services-field">
                                <span>Тип прибирання</span>
                                <select
                                    value={cleaningType}
                                    onChange={(event) =>
                                        setCleaningType(
                                            event.target.value as (typeof customCleaningTypes)[number]["id"],
                                        )
                                    }
                                >
                                    {customCleaningTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="services-field">
                                <span>Площа, м²</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={300}
                                    value={area}
                                    onChange={(event) => setArea(event.target.value)}
                                    inputMode="numeric"
                                    placeholder="55"
                                />
                            </label>

                            <fieldset className="services-extras services-extras--org">
                                <legend>Організаційні опції</legend>
                                <div className="services-org-grid">
                                    <label className="services-field">
                                        <span>Тип житла</span>
                                        <select
                                            value={propertyType}
                                            onChange={(event) =>
                                                setPropertyType(
                                                    event.target.value as (typeof propertyTypeOptions)[number]["id"],
                                                )
                                            }
                                        >
                                            {propertyTypeOptions.map((option) => (
                                                <option key={option.id} value={option.id}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="services-field">
                                        <span>Ступінь забруднення</span>
                                        <select
                                            value={pollutionLevel}
                                            onChange={(event) =>
                                                setPollutionLevel(
                                                    event.target.value as (typeof pollutionLevelOptions)[number]["id"],
                                                )
                                            }
                                        >
                                            {pollutionLevelOptions.map((option) => (
                                                <option key={option.id} value={option.id}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="services-field">
                                        <span>Кількість прибиральників</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={6}
                                            value={cleanersCount}
                                            onChange={(event) => setCleanersCount(event.target.value)}
                                            inputMode="numeric"
                                        />
                                    </label>
                                </div>
                                <OrganizationalChecks
                                    hasPets={hasPets}
                                    ownSupplies={ownSupplies}
                                    ownVacuum={ownVacuum}
                                    onHasPetsChange={setHasPets}
                                    onOwnSuppliesChange={setOwnSupplies}
                                    onOwnVacuumChange={setOwnVacuum}
                                />
                            </fieldset>

                            <AdditionalServicesSection
                                quantities={extraQuantities}
                                onToggle={toggleExtra}
                                onQuantityChange={setExtraQuantity}
                                alwaysExpanded
                            />

                            <OrderAddressSelector
                                addresses={savedAddresses}
                                selection={addressSelection}
                                onSelectionChange={setAddressSelection}
                                customAddress={customAddress}
                                onCustomAddressChange={setCustomAddress}
                                loading={addressesLoading}
                            />

                            <CleaningTimeSlotSelector
                                value={cleaningTimeSlot}
                                onChange={setCleaningTimeSlot}
                            />

                            <label className="services-field services-field--comment">
                                <span>Коментар</span>
                                <AutoResizeTextarea
                                    className="services-comment-field"
                                    placeholder="Особливі побажання, доступ до приміщення..."
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                />
                            </label>
                        </form>

                        <aside className="services-custom-summary hero-panel" aria-live="polite">
                            <span className="badge hero-badge">Орієнтовна вартість</span>
                            <p className="services-custom-price">
                                {formatPrice(
                                    customEstimate.isReady
                                        ? paymentMethod === "card"
                                            ? getCardPaymentTotal(customEstimate.total)
                                            : customEstimate.total
                                        : 0,
                                )}
                            </p>
                            <p
                                className={`services-custom-min-note${
                                    customEstimate.isReady && customEstimate.total < MIN_CUSTOM_ORDER_TOTAL
                                        ? " services-custom-min-note--warning"
                                        : ""
                                }`}
                            >
                                Мінімальна сума замовлення — {formatPrice(MIN_CUSTOM_ORDER_TOTAL)}
                            </p>
                            {customEstimate.isReady && paymentMethod === "card" ? (
                                <p className="services-custom-discount-note">
                                    Зі знижкою 10% при оплаті картою
                                </p>
                            ) : null}
                            <p className="services-custom-note">
                                {customEstimate.hasSelectedExtras
                                    ? "Точну суму підтвердимо перед виїздом після короткої консультації."
                                    : "Оберіть послуги зі списку — вартість рахується від обраних позицій та площі."}
                            </p>

                            <ul className="services-custom-breakdown">
                                <li>
                                    <span>Тип прибирання</span>
                                    <span>{customEstimate.typeLabel}</span>
                                </li>
                                <li>
                                    <span>Площа</span>
                                    <span>{customEstimate.sqm > 0 ? `${customEstimate.sqm} м²` : "—"}</span>
                                </li>
                                {customEstimate.extrasTotal > 0 ? (
                                    <>
                                        {getSelectedCustomExtraLabels(extraQuantities).map((label) => (
                                            <li key={label}>
                                                <span>{label}</span>
                                                <span aria-hidden="true">✓</span>
                                            </li>
                                        ))}
                                        <li>
                                            <span>Додаткові послуги</span>
                                            <span>{formatPrice(customEstimate.extrasTotal)}</span>
                                        </li>
                                    </>
                                ) : null}
                                <li>
                                    <span>Час</span>
                                    <span>{getCleaningTimeSlotLabel(cleaningTimeSlot)}</span>
                                </li>
                            </ul>

                            <OrderPaymentOptions
                                total={customEstimate.isReady ? customEstimate.total : 0}
                                method={paymentMethod}
                                onMethodChange={setPaymentMethod}
                                onSubmit={handlePaymentSubmit}
                                error={checkoutError}
                                isSubmitting={isSubmittingOrder || isPaying}
                                submitDisabled={
                                    !customEstimate.isReady ||
                                    !customEstimate.hasSelectedExtras ||
                                    customEstimate.total < MIN_CUSTOM_ORDER_TOTAL
                                }
                            />
                        </aside>
                    </div>
                </div>
            )}

            {activeTab === "subscription" && (
                <div
                    id="services-panel-subscription"
                    role="tabpanel"
                    aria-labelledby="services-tab-subscription"
                    className="services-panel"
                >
                    <p className="services-panel-lead">
                        28-денний цикл — обери дні в календарі, додай послуги та площу. Ціна оновиться одразу.
                    </p>

                    <div className="services-custom">
                        <form
                            className="services-custom-form hero-panel"
                            onSubmit={(event) => event.preventDefault()}
                        >
                            <h2 className="services-custom-title">Налаштування підписки</h2>

                            <SubscriptionCycleCalendar
                                visitDays={subscriptionVisitDays}
                                onToggleDay={toggleSubscriptionVisitDay}
                                onClear={() => setSubscriptionVisitDays([])}
                                onSelectAll={() =>
                                    setSubscriptionVisitDays(
                                        Array.from({ length: SUBSCRIPTION_CYCLE_DAYS }, (_, index) => index + 1),
                                    )
                                }
                            />

                            <div className="services-subscription-billing hero-panel">
                                <h3 className="services-subscription-billing-title">Оплата</h3>
                                <p className="services-subscription-billing-text">
                                    Рахунок формується на{" "}
                                    <strong>{SUBSCRIPTION_CYCLE_DAYS} днів</strong> — стільки візитів,
                                    скільки вміститься у ваш графік.
                                </p>
                                <label className="services-extra-option services-extra-option--inline services-subscription-autopay">
                                    <input
                                        type="checkbox"
                                        checked={subscriptionAutoPay}
                                        onChange={(event) => setSubscriptionAutoPay(event.target.checked)}
                                    />
                                    <span className="services-extra-copy">
                                        <span>Автоматична оплата кожні {SUBSCRIPTION_CYCLE_DAYS} днів карткою</span>
                                    </span>
                                </label>
                                <p className="services-subscription-autopay-note">
                                    {subscriptionAutoPay
                                        ? "При оформленні один раз прив'язуєте картку — далі оплата проходитиме автоматично наприкінці кожного 28-денного періоду."
                                        : "Оплата вручну наприкінці кожного 28-денного періоду — нагадаємо перед датою."}
                                </p>
                            </div>

                            <label className="services-field">
                                <span>Площа, м²</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={300}
                                    value={subscriptionArea}
                                    onChange={(event) => setSubscriptionArea(event.target.value)}
                                    inputMode="numeric"
                                    placeholder="55"
                                />
                            </label>

                            <AdditionalServicesSection
                                quantities={subscriptionExtraQuantities}
                                onToggle={toggleSubscriptionExtra}
                                onQuantityChange={setSubscriptionExtraQuantity}
                            />

                            <label className="services-field services-field--comment">
                                <span>Коментар</span>
                                <AutoResizeTextarea
                                    className="services-comment-field"
                                    placeholder="Зручний час, ключі, особливі побажання..."
                                    value={subscriptionNotes}
                                    onChange={(event) => setSubscriptionNotes(event.target.value)}
                                />
                            </label>
                        </form>

                        <aside className="services-custom-summary hero-panel" aria-live="polite">
                            <span className="badge hero-badge">Вартість підписки</span>
                            <p className="services-custom-price">
                                {formatPrice(
                                    subscriptionEstimate.isReady
                                        ? subscriptionEstimate.discountedCycleTotal
                                        : 0,
                                )}
                                {subscriptionEstimate.isReady ? (
                                    <span className="services-subscription-price-unit">
                                        {" "}
                                        / {SUBSCRIPTION_CYCLE_DAYS} днів
                                    </span>
                                ) : null}
                            </p>
                            <p
                                className={`services-custom-min-note${
                                    subscriptionEstimate.isReady &&
                                    !subscriptionEstimate.meetsMinimumPerVisit
                                        ? " services-custom-min-note--warning"
                                        : ""
                                }`}
                            >
                                Мінімальна сума — {formatPrice(MIN_SUBSCRIPTION_PER_VISIT)} за 1 візит
                            </p>
                            {subscriptionEstimate.isReady ? (
                                <p className="services-custom-discount-note">
                                    Знижка 10% на підписку порівняно з разовими візитами
                                </p>
                            ) : null}
                            <p className="services-custom-note">
                                {!subscriptionEstimate.hasScheduleSelected
                                    ? "Обери дні в календарі."
                                    : !subscriptionEstimate.hasSelectedExtras
                                      ? "Додайте послуги зі списку — вартість рахується від обраних позицій та площі."
                                      : !subscriptionEstimate.isReady
                                        ? "Вкажіть площу для розрахунку вартості."
                                        : !subscriptionEstimate.meetsMinimumPerVisit
                                          ? `Додайте послуги — мінімум ${formatPrice(MIN_SUBSCRIPTION_PER_VISIT)} за один візит.`
                                          : subscriptionAutoPay
                                          ? "Оплата автоматично кожні 28 днів. Той самий виконавець і пріоритет у записі."
                                          : "Нагадування перед оплатою кожні 28 днів."}
                            </p>

                            <ul className="services-custom-breakdown">
                                <li>
                                    <span>Графік</span>
                                    <span>{formatVisitDaysSummary(subscriptionEstimate.visitDays)}</span>
                                </li>
                                <li>
                                    <span>Візитів за цикл</span>
                                    <span>
                                        {subscriptionEstimate.hasScheduleSelected
                                            ? subscriptionEstimate.visitsInCycle
                                            : "—"}
                                    </span>
                                </li>
                                <li>
                                    <span>Площа</span>
                                    <span>
                                        {subscriptionEstimate.sqm > 0 ? `${subscriptionEstimate.sqm} м²` : "—"}
                                    </span>
                                </li>
                                {subscriptionEstimate.extrasTotal > 0 ? (
                                    <>
                                        {getSelectedCustomExtraLabels(subscriptionExtraQuantities).map((label) => (
                                            <li key={label}>
                                                <span>{label}</span>
                                                <span aria-hidden="true">✓</span>
                                            </li>
                                        ))}
                                        <li>
                                            <span>За 1 візит</span>
                                            <span>{formatPrice(subscriptionEstimate.perVisitTotal)}</span>
                                        </li>
                                    </>
                                ) : null}
                                {subscriptionEstimate.isReady ? (
                                    <li>
                                        <span>Без знижки</span>
                                        <span>
                                            {formatPrice(subscriptionEstimate.cycleTotal)} / {SUBSCRIPTION_CYCLE_DAYS}{" "}
                                            днів
                                        </span>
                                    </li>
                                ) : null}
                                <li>
                                    <span>Оплата</span>
                                    <span>{subscriptionAutoPay ? "Авто кожні 28 днів" : "Вручну кожні 28 днів"}</span>
                                </li>
                            </ul>

                            <a
                                href={supportContacts.emailHref}
                                className={`primary-button services-custom-cta${
                                    !subscriptionEstimate.isReady ||
                                    !subscriptionEstimate.meetsMinimumPerVisit
                                        ? " services-custom-cta--disabled"
                                        : ""
                                }`}
                                aria-disabled={
                                    !subscriptionEstimate.isReady ||
                                    !subscriptionEstimate.meetsMinimumPerVisit
                                }
                                onClick={(event) => {
                                    if (
                                        !subscriptionEstimate.isReady ||
                                        !subscriptionEstimate.meetsMinimumPerVisit
                                    ) {
                                        event.preventDefault();
                                    }
                                }}
                            >
                                Оформити підписку
                            </a>
                        </aside>
                    </div>
                </div>
            )}
        </div>
    );
}
