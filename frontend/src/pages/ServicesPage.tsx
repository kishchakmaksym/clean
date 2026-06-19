import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { createMonoInvoice } from "../api/payments";
import { createOrder } from "../api/orders";
import { savePendingOrder, type PendingOrderPayload } from "../api/pendingOrder";
import { buildOrderAddressFields, fetchProfile, type UserAddressDto } from "../api/profile";
import { validateServiceAreaAddress } from "../utils/serviceAreaAddress";
import { supportContacts } from "../config/contacts";
import {
    allCustomExtras,
    buildCustomOrganizationalNote,
    customCleaningTypes,
    customExtraCategories,
    pollutionLevelOptions,
    propertyTypeOptions,
    calculateCustomExtraTotal,
    customExtraUsesQuantity,
    formatCustomExtraOrderLabel,
    formatCustomExtraRate,
    getCustomExtraQuantityLabel,
    type CustomExtraItem,
} from "../config/customCleaningOptions";
import OrderAddressSelector from "../components/profile/OrderAddressSelector";
import { useAuth } from "../auth/AuthContext";
import "./HomePage.css";
import "./ServicesPage.css";

type ServiceTab = "fixed" | "custom" | "subscription";

function parseServiceTab(value: string | null): ServiceTab {
    if (value === "custom" || value === "subscription") {
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
        text: "Швидке наведення ладу — підлога, поверхні, дзеркала та сміття без генерального навантаження.",
        duration: "1–2 год",
        basePerSqm: 25,
        sqmTierThreshold: 50,
        sqmTierRate: 20,
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
        id: "light-clean",
        title: "Легке прибирання",
        text: "Швидке наведення порядку в невеликому просторі — базові поверхні та підлога.",
        duration: "1–1.5 год",
        flatPrice: 1,
        packageItems: [
            { id: "floor", label: "Пилосос і миття підлоги", defaultSelected: true, adjustment: 0 },
            { id: "dust", label: "Протирання поверхонь", defaultSelected: true, adjustment: 0 },
            { id: "trash", label: "Винесення сміття", defaultSelected: true, adjustment: 0 },
        ],
    },
    {
        id: "quick-clean",
        title: "Швидке прибирання",
        text: "Акуратне прибирання основних зон — кухня, санвузол і житлові кімнати.",
        duration: "1.5–2 год",
        flatPrice: 2,
        packageItems: [
            { id: "kitchen", label: "Вологе прибирання кухні", defaultSelected: true, adjustment: 0 },
            { id: "bathroom", label: "Санвузол і дзеркала", defaultSelected: true, adjustment: 0 },
            { id: "floor", label: "Пилосос і миття підлоги", defaultSelected: true, adjustment: 0 },
            { id: "windows", label: "Миття вікон", defaultSelected: false, adjustment: 250 },
        ],
    },
    {
        id: "basic-clean",
        title: "Базове прибирання",
        text: "Повний базовий цикл для квартири — усе необхідне для охайного результату.",
        duration: "2–3 год",
        flatPrice: 5,
        packageItems: [
            { id: "rooms", label: "Прибирання всіх кімнат", defaultSelected: true, adjustment: 0 },
            { id: "kitchen", label: "Кухня: плита, стільниці, фартух", defaultSelected: true, adjustment: 0 },
            { id: "bathroom", label: "Санвузол і дзеркала", defaultSelected: true, adjustment: 0 },
            { id: "floor", label: "Пилосос і миття підлоги", defaultSelected: true, adjustment: 0 },
            { id: "fridge", label: "Холодильник", defaultSelected: false, adjustment: 180 },
        ],
    },
    {
        id: "after-tenants",
        title: "Прибирання після орендарів",
        text: "Повне відновлення квартири після виїзду — готовимо житло до нових мешканців або здачі.",
        basePerSqm: 30,
        duration: "4–7 год",
        packageItems: [
            { id: "rooms", label: "Глибоке прибирання всіх кімнат", defaultSelected: true, adjustment: 80 },
            { id: "kitchen", label: "Кухня: плита, фартух, шафи зовні", defaultSelected: true, adjustment: 70 },
            { id: "bathroom", label: "Санвузол і дзеркала", defaultSelected: true, adjustment: 60 },
            { id: "windows", label: "Вікна зсередини та підвіконня", defaultSelected: true, adjustment: 120 },
            { id: "cabinets", label: "Внутрішні поверхні шаф", defaultSelected: true, adjustment: 150 },
            { id: "oven", label: "Духова шафа", defaultSelected: false, adjustment: 220 },
            { id: "balcony", label: "Балкон", defaultSelected: false, adjustment: 150 },
        ],
    },
    {
        id: "after-renovation",
        title: "Прибирання після ремонту",
        text: "Прибираємо будівельний пил, сліди матеріалів і дрібні залишки після будівельних робіт.",
        basePerSqm: 38,
        duration: "6–12 год",
        packageItems: [
            { id: "dust", label: "Пил після ремонту з усіх поверхонь", defaultSelected: true, adjustment: 100 },
            { id: "floor-tile", label: "Миття підлоги, плитки та швів", defaultSelected: true, adjustment: 90 },
            { id: "windows", label: "Вікна, рами та підвіконня", defaultSelected: true, adjustment: 110 },
            { id: "polish", label: "Фінальна поліровка і перевірка", defaultSelected: true, adjustment: 100 },
            { id: "fixtures", label: "Батареї та плінтуси", defaultSelected: true, adjustment: 90 },
            { id: "facade-windows", label: "Скло зовні", defaultSelected: false, adjustment: 400 },
            { id: "garbage", label: "Вивіз будівельного сміття", defaultSelected: false, adjustment: 350 },
        ],
    },
    {
        id: "maintenance",
        title: "Підтримуюче прибирання",
        text: "Легкий регулярний догляд — щоб у домі завжди було охайно між генеральними прибираннями.",
        basePerSqm: 16,
        duration: "1.5–3 год",
        packageItems: [
            { id: "floor", label: "Пилосос і вологе прибирання підлоги", defaultSelected: true, adjustment: 45 },
            { id: "kitchen-bath", label: "Кухня та санвузол — базовий цикл", defaultSelected: true, adjustment: 50 },
            { id: "dust", label: "Протирання пилу з поверхонь", defaultSelected: true, adjustment: 35 },
            { id: "bedroom", label: "Спальня та текстиль", defaultSelected: true, adjustment: 45 },
            { id: "living", label: "Вітальня / коридор", defaultSelected: true, adjustment: 45 },
            { id: "ironing", label: "Прасування", defaultSelected: false, adjustment: 280 },
            { id: "dishes", label: "Миття посуду", defaultSelected: false, adjustment: 120 },
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

const subscriptionPlans = [
    {
        title: "Щотижня",
        text: "Підтримуюче прибирання раз на тиждень — завжди охайно вдома.",
        frequency: "4 візити на місяць",
        area: "до 45 м²",
        price: "2 100 ₴/міс",
        visitPrice: "525 ₴ за візит",
        includes: [
            "Легке прибирання кухні та санвузла",
            "Пилосос і миття підлоги",
            "Той самий виконавець",
            "Пріоритет у записі",
        ],
    },
    {
        title: "Раз на 2 тижні",
        text: "Оптимально для невеликих квартир без щоденного навантаження.",
        frequency: "2 візити на місяць",
        area: "до 55 м²",
        price: "1 150 ₴/міс",
        visitPrice: "575 ₴ за візит",
        includes: [
            "Підтримуюче прибирання",
            "Кухня, санвузол, жила зона",
            "Гнучкий перенос дати",
            "Знижка −8% від разових цін",
        ],
    },
    {
        title: "Щомісяця",
        text: "Глибше прибирання раз на місяць — базовий догляд за житлом.",
        frequency: "1 візит на місяць",
        area: "до 60 м²",
        price: "750 ₴/міс",
        visitPrice: "750 ₴ за візит",
        includes: [
            "Повне підтримуюче прибирання",
            "Кухня, санвузол, кімнати",
            "Нагадування перед візитом",
            "Можна додати генеральне раз на квартал",
        ],
    },
    {
        title: "Офісний абонемент",
        text: "Регулярний догляд за офісом за фіксованим графіком.",
        frequency: "8 візитів на місяць",
        area: "до 50 м²",
        price: "8 800 ₴/міс",
        visitPrice: "1 100 ₴ за візит",
        includes: [
            "Прибирання робочих зон",
            "Кухня та санвузол",
            "Договір для компанії",
            "Заміна виконавця при відпустці",
        ],
    },
] as const;

const cleaningTimeSlots = [
    { id: "morning", label: "08:00 – 12:00" },
    { id: "afternoon", label: "12:00 – 16:00" },
    { id: "evening", label: "16:00 – 20:00" },
] as const;

type CleaningTimeSlotId = (typeof cleaningTimeSlots)[number]["id"];

function getCleaningTimeSlotLabel(id: CleaningTimeSlotId) {
    return cleaningTimeSlots.find((slot) => slot.id === id)?.label ?? cleaningTimeSlots[0].label;
}

type CleaningTimeSlotSelectorProps = {
    value: CleaningTimeSlotId;
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
                        className={`services-time-slot${value === slot.id ? " services-time-slot--selected" : ""}`}
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
    return Math.max(1, Math.round(total * 0.9));
}

type PaymentMethod = "card" | "cash";

type OrderPaymentOptionsProps = {
    total: number;
    method: PaymentMethod;
    onMethodChange: (method: PaymentMethod) => void;
    onSubmit: () => void;
    error?: string;
    isSubmitting?: boolean;
};

function OrderPaymentOptions({
    total,
    method,
    onMethodChange,
    onSubmit,
    error,
    isSubmitting = false,
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
                disabled={isSubmitting}
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
    return (
        <div className="services-extras-categories">
            {customExtraCategories.map((category) => (
                <fieldset key={category.id} className="services-extras services-extras--group">
                    <legend>{category.title}</legend>
                    <div className="services-extras-grid">
                        {category.items.map((extra) => {
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
                                                onChange={(event) =>
                                                    onQuantityChange(extra.id, event.target.value)
                                                }
                                                inputMode="numeric"
                                                aria-label={`${getCustomExtraQuantityLabel(extra)}: ${extra.label}`}
                                            />
                                        </label>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </fieldset>
            ))}
        </div>
    );
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

function estimateCustomOrder(
    basePerSqm: number,
    area: string,
    rooms: string,
    bathrooms: string,
    extrasTotal = 0,
) {
    const sqm = Math.max(20, Number.parseInt(area, 10) || 0);
    const roomCount = Math.max(1, Number.parseInt(rooms, 10) || 1);
    const bathCount = Math.max(1, Number.parseInt(bathrooms, 10) || 1);
    const base = sqm * basePerSqm;
    const roomFee = Math.max(0, roomCount - 1) * 120;
    const bathFee = Math.max(0, bathCount - 1) * 180;

    return {
        sqm,
        roomCount,
        bathCount,
        total: Math.round(base + roomFee + bathFee + extrasTotal),
    };
}

function getPackageItemPriceHint(item: FixedPackageItem) {
    if (item.defaultSelected) {
        return "в пакеті";
    }

    return `+${formatPrice(item.adjustment)}`;
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
        activeTab === "fixed" && isFixedServiceId(serviceParam) ? serviceParam : null;
    const [isPaying, setIsPaying] = useState(false);
    const [paymentError, setPaymentError] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
    const [cleaningTimeSlot, setCleaningTimeSlot] = useState<CleaningTimeSlotId>("morning");
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [checkoutError, setCheckoutError] = useState("");

    const [fixedArea, setFixedArea] = useState("55");
    const [fixedSelectedAddons, setFixedSelectedAddons] = useState<string[]>([]);
    const [fixedExtraQuantities, setFixedExtraQuantities] = useState<Record<string, number>>({});
    const [fixedNotes, setFixedNotes] = useState("");

    const [cleaningType, setCleaningType] = useState<(typeof customCleaningTypes)[number]["id"]>("regular");
    const [area, setArea] = useState("55");
    const [rooms, setRooms] = useState("2");
    const [bathrooms, setBathrooms] = useState("1");
    const [extraQuantities, setExtraQuantities] = useState<Record<string, number>>({});
    const [notes, setNotes] = useState("");
    const [propertyType, setPropertyType] = useState<(typeof propertyTypeOptions)[number]["id"]>("apartment");
    const [pollutionLevel, setPollutionLevel] = useState<(typeof pollutionLevelOptions)[number]["id"]>("light");
    const [hasPets, setHasPets] = useState(false);
    const [ownSupplies, setOwnSupplies] = useState(false);
    const [needLadder, setNeedLadder] = useState(false);
    const [hasElevator, setHasElevator] = useState(true);
    const [cleanersCount, setCleanersCount] = useState("1");

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
        const customExtrasTotal = allCustomExtras
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
        const sqm = Math.max(20, Number.parseInt(area, 10) || 0);
        const extrasTotal = allCustomExtras
            .filter((extra) => (extraQuantities[extra.id] ?? 0) > 0)
            .reduce(
                (sum, extra) =>
                    sum + calculateCustomExtraTotal(extra, sqm, extraQuantities[extra.id] ?? 1),
                0,
            );

        const result = estimateCustomOrder(type.basePerSqm, area, rooms, bathrooms, extrasTotal);

        return {
            ...result,
            typeLabel: type.label,
            extrasTotal,
        };
    }, [area, bathrooms, cleaningType, extraQuantities, rooms]);

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

    function toggleExtra(extra: (typeof allCustomExtras)[number]) {
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

    function toggleFixedAddon(id: string) {
        setFixedSelectedAddons((current) =>
            current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
        );
    }

    function openFixedService(id: FixedServiceId) {
        const service = fixedServiceCategories.find((item) => item.id === id);
        if (!service) {
            return;
        }

        setFixedArea("55");
        setFixedSelectedAddons([]);
        setFixedExtraQuantities({});
        setFixedNotes("");
        setPaymentError("");
        setPaymentMethod("card");
        setCleaningTimeSlot("morning");
        setCheckoutError("");

        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set("tab", "fixed");
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

        const addressFields = getOrderAddressFields()!;

        const selectedPackageAddonLabels = selectedService.packageItems
            .filter((item) => !item.defaultSelected && fixedSelectedAddons.includes(item.id))
            .map((item) => item.label);
        const selectedCustomExtraLabels = allCustomExtras
            .filter((extra) => (fixedExtraQuantities[extra.id] ?? 0) > 0)
            .map((extra) =>
                formatCustomExtraOrderLabel(extra, fixedExtraQuantities[extra.id] ?? 1),
            );

        const orderPayload = {
            userId: user.id,
            serviceId: selectedService.id,
            serviceTitle: selectedService.title,
            orderType: "fixed" as const,
            areaSqm: selectedService.flatPrice != null ? undefined : fixedEstimate.sqm,
            selectedAddons: [...selectedPackageAddonLabels, ...selectedCustomExtraLabels],
            timeSlot: cleaningTimeSlot,
            timeSlotLabel: getCleaningTimeSlotLabel(cleaningTimeSlot),
            notes: fixedNotes.trim() || undefined,
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

        const addressFields = getOrderAddressFields()!;

        const selectedAddonLabels = allCustomExtras
            .filter((extra) => (extraQuantities[extra.id] ?? 0) > 0)
            .map((extra) =>
                formatCustomExtraOrderLabel(extra, extraQuantities[extra.id] ?? 1),
            );

        const organizationalNote = buildCustomOrganizationalNote({
            propertyType,
            pollutionLevel,
            hasPets,
            ownSupplies,
            needLadder,
            hasElevator,
            cleanersCount,
        });

        const combinedNotes = [organizationalNote, notes.trim()].filter(Boolean).join("\n\n");

        const orderPayload = {
            userId: user.id,
            serviceId: cleaningType,
            serviceTitle: customEstimate.typeLabel,
            orderType: "custom" as const,
            areaSqm: customEstimate.sqm,
            rooms: customEstimate.roomCount,
            bathrooms: customEstimate.bathCount,
            selectedAddons: selectedAddonLabels,
            timeSlot: cleaningTimeSlot,
            timeSlotLabel: getCleaningTimeSlotLabel(cleaningTimeSlot),
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
                    description: `${customEstimate.typeLabel} — ${customEstimate.sqm} м², ${getCleaningTimeSlotLabel(cleaningTimeSlot)}`,
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
            next.set("tab", "fixed");
            return next;
        });
        setCheckoutError("");
    }

    function switchTab(tab: ServiceTab) {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set("tab", tab);
            if (tab !== "fixed") {
                next.delete("service");
            }
            return next;
        });
        setCheckoutError("");
    }

    function confirmCheckoutOrder() {
        if (activeTab === "fixed") {
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
                        id="services-tab-subscription"
                        aria-selected={activeTab === "subscription"}
                        aria-controls="services-panel-subscription"
                        className={`services-tab${activeTab === "subscription" ? " services-tab--active" : ""}`}
                        onClick={() => switchTab("subscription")}
                    >
                        <span className="services-tab-label services-tab-label--full">Прибирання по підписці</span>
                        <span className="services-tab-label services-tab-label--short">Підписка</span>
                    </button>
                </div>
            </div>

            {activeTab === "fixed" && (
                <div
                    ref={fixedPanelRef}
                    id="services-panel-fixed"
                    role="tabpanel"
                    aria-labelledby="services-tab-fixed"
                    className="services-panel"
                >
                    {selectedService && fixedEstimate ? (
                        <>
                            <button type="button" className="services-back" onClick={closeFixedService}>
                                ← Усі послуги
                            </button>

                            <p className="services-panel-lead">
                                {selectedService.flatPrice != null
                                    ? "Базовий пакет уже включений. За потреби додайте додаткові опції."
                                    : "Вкажіть площу — базовий пакет уже включений. За потреби додайте додаткові опції."}
                            </p>

                            <div className="services-custom">
                                <form
                                    className="services-custom-form hero-panel"
                                    onSubmit={(event) => event.preventDefault()}
                                >
                                    <h2 className="services-custom-title">{selectedService.title}</h2>
                                    <p className="services-category-desc">{selectedService.text}</p>

                                    <div className="services-category-rate hero-panel">
                                        <span className="services-category-rate-label">Базова ціна</span>
                                        <span className="services-category-rate-value">
                                            {selectedService.flatPrice != null ? (
                                                formatPrice(selectedService.flatPrice)
                                            ) : selectedService.sqmTierThreshold != null &&
                                              selectedService.sqmTierRate != null ? (
                                                <>
                                                    {formatPrice(selectedService.basePerSqm ?? 0)}{" "}
                                                    <span>/ м² до {selectedService.sqmTierThreshold} м²</span>
                                                    <span className="services-category-rate-tier">
                                                        {formatPrice(selectedService.sqmTierRate)} / м² далі
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    {formatPrice(selectedService.basePerSqm ?? 0)}{" "}
                                                    <span>/ м²</span>
                                                </>
                                            )}
                                        </span>
                                    </div>

                                    <label className="services-field services-field--area">
                                        <span>
                                            {selectedService.flatPrice != null
                                                ? "Площа, м² (для додаткових послуг)"
                                                : "Площа, м²"}
                                        </span>
                                        <input
                                            type="number"
                                            min={20}
                                            max={500}
                                            value={fixedArea}
                                            onChange={(event) => setFixedArea(event.target.value)}
                                            inputMode="numeric"
                                        />
                                    </label>

                                    <fieldset className="services-extras">
                                        <legend>В пакеті</legend>
                                        <div className="services-extras-grid">
                                            {selectedService.packageItems
                                                .filter((item) => item.defaultSelected)
                                                .map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="services-extra-option services-extra-option--locked services-extra-option--on"
                                                    >
                                                        <input type="checkbox" checked disabled readOnly />
                                                        <span className="services-extra-copy">
                                                            <span>{item.label}</span>
                                                            <span className="services-extra-included">в пакеті</span>
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                    </fieldset>

                                    {selectedService.packageItems.some((item) => !item.defaultSelected) ? (
                                        <fieldset className="services-extras">
                                            <legend>Можна додати</legend>
                                            <div className="services-extras-grid">
                                                {selectedService.packageItems
                                                    .filter((item) => !item.defaultSelected)
                                                    .map((item) => {
                                                        const isSelected = fixedSelectedAddons.includes(item.id);

                                                        return (
                                                            <label
                                                                key={item.id}
                                                                className={`services-extra-option${isSelected ? " services-extra-option--on" : ""}`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => toggleFixedAddon(item.id)}
                                                                />
                                                                <span className="services-extra-copy">
                                                                    <span>{item.label}</span>
                                                                    <span>{getPackageItemPriceHint(item)}</span>
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                            </div>
                                        </fieldset>
                                    ) : null}

                                    <fieldset className="services-extras">
                                        <legend>Додаткові послуги</legend>
                                        <CustomExtrasSelector
                                            quantities={fixedExtraQuantities}
                                            onToggle={toggleFixedExtra}
                                            onQuantityChange={setFixedExtraQuantity}
                                        />
                                    </fieldset>

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

                                    <label className="services-field">
                                        <span>Коментар</span>
                                        <textarea
                                            rows={3}
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
                                            <li>
                                                <span>Додаткові послуги</span>
                                                <span>+{formatPrice(fixedEstimate.customExtrasTotal)}</span>
                                            </li>
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
                                Оберіть тип прибирання — натисніть «Розрахувати вартість», щоб побачити
                                орієнтовну суму та оформити замовлення.
                            </p>

                            <div className="services-grid services-grid--categories">
                                {fixedServiceCategories.map((service) => (
                                    <article key={service.id} className="services-card services-card--category hero-panel">
                                        <div className="services-category-head">
                                            <h2 className="services-card-title">{service.title}</h2>
                                            <p className="services-category-price">
                                                {service.flatPrice != null ? (
                                                    <>
                                                        <span className="services-category-price-amount">
                                                            {formatPrice(service.flatPrice)}
                                                        </span>
                                                        <span className="services-category-price-unit">фікс.</span>
                                                    </>
                                                ) : service.sqmTierThreshold != null && service.sqmTierRate != null ? (
                                                    <>
                                                        <span className="services-category-price-amount">
                                                            {formatPrice(service.basePerSqm ?? 0)}
                                                        </span>
                                                        <span className="services-category-price-unit">
                                                            / м² до {service.sqmTierThreshold} м²
                                                        </span>
                                                        <span className="services-category-price-tier">
                                                            {formatPrice(service.sqmTierRate)} / м² далі
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

                                        <div className="services-category-body">
                                            <p className="services-category-includes-title">Склад пакета</p>
                                            <ul className="services-package-preview">
                                                {service.packageItems.map((item) => (
                                                    <li
                                                        key={item.id}
                                                        className={`services-package-preview-item${item.defaultSelected ? "" : " services-package-preview-item--extra"}`}
                                                    >
                                                        {item.label}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

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

                            <div className="services-field-row">
                                <label className="services-field">
                                    <span>Площа, м²</span>
                                    <input
                                        type="number"
                                        min={20}
                                        max={300}
                                        value={area}
                                        onChange={(event) => setArea(event.target.value)}
                                        inputMode="numeric"
                                    />
                                </label>
                                <label className="services-field">
                                    <span>Кімнати</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={8}
                                        value={rooms}
                                        onChange={(event) => setRooms(event.target.value)}
                                        inputMode="numeric"
                                    />
                                </label>
                                <label className="services-field">
                                    <span>Санвузли</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={4}
                                        value={bathrooms}
                                        onChange={(event) => setBathrooms(event.target.value)}
                                        inputMode="numeric"
                                    />
                                </label>
                            </div>

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
                                <div className="services-org-checks">
                                    <label className="services-extra-option services-extra-option--inline">
                                        <input
                                            type="checkbox"
                                            checked={hasPets}
                                            onChange={(event) => setHasPets(event.target.checked)}
                                        />
                                        <span className="services-extra-copy">
                                            <span>Є домашні тварини</span>
                                        </span>
                                    </label>
                                    <label className="services-extra-option services-extra-option--inline">
                                        <input
                                            type="checkbox"
                                            checked={ownSupplies}
                                            onChange={(event) => setOwnSupplies(event.target.checked)}
                                        />
                                        <span className="services-extra-copy">
                                            <span>Потрібні власні засоби</span>
                                        </span>
                                    </label>
                                    <label className="services-extra-option services-extra-option--inline">
                                        <input
                                            type="checkbox"
                                            checked={needLadder}
                                            onChange={(event) => setNeedLadder(event.target.checked)}
                                        />
                                        <span className="services-extra-copy">
                                            <span>Потрібна драбина</span>
                                        </span>
                                    </label>
                                    <label className="services-extra-option services-extra-option--inline">
                                        <input
                                            type="checkbox"
                                            checked={hasElevator}
                                            onChange={(event) => setHasElevator(event.target.checked)}
                                        />
                                        <span className="services-extra-copy">
                                            <span>Є ліфт</span>
                                        </span>
                                    </label>
                                </div>
                            </fieldset>

                            <CustomExtrasSelector
                                quantities={extraQuantities}
                                onToggle={toggleExtra}
                                onQuantityChange={setExtraQuantity}
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

                            <label className="services-field">
                                <span>Коментар</span>
                                <textarea
                                    rows={3}
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
                                    paymentMethod === "card"
                                        ? getCardPaymentTotal(customEstimate.total)
                                        : customEstimate.total,
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
                                    <span>{customEstimate.typeLabel}</span>
                                    <span>{customEstimate.sqm} м²</span>
                                </li>
                                <li>
                                    <span>Кімнати</span>
                                    <span>{customEstimate.roomCount}</span>
                                </li>
                                <li>
                                    <span>Санвузли</span>
                                    <span>{customEstimate.bathCount}</span>
                                </li>
                                {customEstimate.extrasTotal > 0 ? (
                                    <li>
                                        <span>Додатково</span>
                                        <span>{formatPrice(customEstimate.extrasTotal)}</span>
                                    </li>
                                ) : null}
                                <li>
                                    <span>Час</span>
                                    <span>{getCleaningTimeSlotLabel(cleaningTimeSlot)}</span>
                                </li>
                            </ul>

                            <OrderPaymentOptions
                                total={customEstimate.total}
                                method={paymentMethod}
                                onMethodChange={setPaymentMethod}
                                onSubmit={handlePaymentSubmit}
                                error={checkoutError}
                                isSubmitting={isSubmittingOrder || isPaying}
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
                        Регулярне прибирання за фіксованим графіком — одна ціна на місяць, той самий
                        виконавець і знижка порівняно з разовими візитами.
                    </p>

                    <div className="services-grid">
                        {subscriptionPlans.map((plan) => (
                            <article key={plan.title} className="services-card hero-panel">
                                <h2 className="services-card-title">{plan.title}</h2>

                                <p className="services-card-text">{plan.text}</p>

                                <div className="services-card-meta">
                                    <div className="services-meta-item">
                                        <span className="services-meta-label">Графік</span>
                                        <span className="services-meta-value">{plan.frequency}</span>
                                    </div>
                                    <div className="services-meta-item">
                                        <span className="services-meta-label">Площа</span>
                                        <span className="services-meta-value">{plan.area}</span>
                                    </div>
                                    <div className="services-meta-item">
                                        <span className="services-meta-label">Ціна</span>
                                        <span className="services-meta-value services-meta-value--price">
                                            {plan.price}
                                        </span>
                                    </div>
                                </div>

                                <p className="services-subscription-note">{plan.visitPrice}</p>

                                <ul className="services-card-includes">
                                    {plan.includes.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>

                                <a
                                    href={supportContacts.phoneHref}
                                    className="secondary-button compact services-card-cta"
                                >
                                    Оформити підписку
                                </a>
                            </article>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
