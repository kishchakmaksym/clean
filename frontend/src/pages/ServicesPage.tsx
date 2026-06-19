import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import "./HomePage.css";
import "./ServicesPage.css";

type ServiceTab = "fixed" | "custom" | "subscription";

const fixedPackages = [
    {
        title: "Студія",
        text: "Компактне житло — швидко і акуратно.",
        area: "до 35 м²",
        price: "800 ₴",
        duration: "2–3 год",
        includes: ["Кухня і санвузол", "Пилосос і миття підлоги", "Поверхні та пил", "Винесення сміття"],
    },
    {
        title: "1-кімнатна",
        text: "Стандартна однокімнатна квартира з кухнею.",
        area: "до 45 м²",
        price: "1 000 ₴",
        duration: "3–4 год",
        includes: ["Кухня і санвузол", "Жила кімната", "Підлога та пил", "Санвузол повністю"],
    },
    {
        title: "2-кімнатна",
        text: "Дві кімнати, кухня та санвузол — повний цикл.",
        area: "до 60 м²",
        price: "1 300 ₴",
        duration: "4–5 год",
        includes: ["2 кімнати + кухня", "Санвузол", "Підлога та пил", "Дверні ручки та вимикачі"],
    },
    {
        title: "3-кімнатна",
        text: "Просторе житло — без поспіху, з увагою до деталей.",
        area: "до 80 м²",
        price: "1 700 ₴",
        duration: "5–6 год",
        includes: ["3 кімнати + кухня", "Санвузол", "Коридор і балкон", "Підлога та пил"],
    },
    {
        title: "Офіс до 50 м²",
        text: "Робочі зони, кухня та санвузол для невеликої команди.",
        area: "до 50 м²",
        price: "1 200 ₴",
        duration: "3–4 год",
        includes: ["Робочі місця", "Переговорна", "Кухня і санвузол", "Підлога та пил"],
    },
] as const;

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

const customCleaningTypes = [
    { id: "regular", label: "Звичайне", basePerSqm: 18 },
    { id: "deep", label: "Генеральне", basePerSqm: 28 },
    { id: "post-renovation", label: "Після ремонту", basePerSqm: 38 },
    { id: "office", label: "Офіс", basePerSqm: 22 },
] as const;

const customExtras = [
    { id: "windows", label: "Миття вікон", price: 350 },
    { id: "fridge", label: "Холодильник", price: 200 },
    { id: "oven", label: "Духова шафа", price: 250 },
    { id: "balcony", label: "Балкон", price: 150 },
    { id: "ironing", label: "Прасування", price: 300 },
] as const;

const pricingNotes = [
    {
        title: "Площа і стан",
        text: "Вартість залежить від метражу, кількості кімнат і ступеня забруднення.",
    },
    {
        title: "Без прихованих платежів",
        text: "Озвучуємо ціну до виїзду. Додаткові роботи — лише за вашою згодою.",
    },
    {
        title: "Зручний запис",
        text: "Підбираємо час під вас: ранок, вечір або вихідні.",
    },
];

function formatPrice(value: number) {
    return `${value.toLocaleString("uk-UA")} ₴`;
}

export default function ServicesPage() {
    const [activeTab, setActiveTab] = useState<ServiceTab>("fixed");

    const [cleaningType, setCleaningType] = useState<(typeof customCleaningTypes)[number]["id"]>("regular");
    const [area, setArea] = useState("55");
    const [rooms, setRooms] = useState("2");
    const [bathrooms, setBathrooms] = useState("1");
    const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
    const [notes, setNotes] = useState("");

    const customEstimate = useMemo(() => {
        const sqm = Math.max(20, Number.parseInt(area, 10) || 0);
        const roomCount = Math.max(1, Number.parseInt(rooms, 10) || 1);
        const bathCount = Math.max(1, Number.parseInt(bathrooms, 10) || 1);
        const type = customCleaningTypes.find((item) => item.id === cleaningType) ?? customCleaningTypes[0];

        const base = sqm * type.basePerSqm;
        const roomFee = Math.max(0, roomCount - 1) * 120;
        const bathFee = Math.max(0, bathCount - 1) * 180;
        const extrasTotal = customExtras
            .filter((extra) => selectedExtras.includes(extra.id))
            .reduce((sum, extra) => sum + extra.price, 0);

        return {
            sqm,
            roomCount,
            bathCount,
            typeLabel: type.label,
            total: Math.round(base + roomFee + bathFee + extrasTotal),
            extrasTotal,
        };
    }, [area, bathrooms, cleaningType, rooms, selectedExtras]);

    function toggleExtra(id: string) {
        setSelectedExtras((current) =>
            current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
        );
    }

    return (
        <div className="services-page">
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
                        onClick={() => setActiveTab("fixed")}
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
                        onClick={() => setActiveTab("custom")}
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
                        onClick={() => setActiveTab("subscription")}
                    >
                        <span className="services-tab-label services-tab-label--full">Прибирання по підписці</span>
                        <span className="services-tab-label services-tab-label--short">Підписка</span>
                    </button>
                </div>
            </div>

            {activeTab === "fixed" && (
                <div
                    id="services-panel-fixed"
                    role="tabpanel"
                    aria-labelledby="services-tab-fixed"
                    className="services-panel"
                >
                    <p className="services-panel-lead">
                        Готові пакети з фіксованою ціною за вказану площу — обирайте і замовляйте без
                        додаткових розрахунків.
                    </p>

                    <div className="services-grid">
                        {fixedPackages.map((pkg) => (
                            <article key={pkg.title} className="services-card hero-panel">
                                <h2 className="services-card-title">{pkg.title}</h2>

                                <p className="services-card-text">{pkg.text}</p>

                                <div className="services-card-meta">
                                    <div className="services-meta-item">
                                        <span className="services-meta-label">Площа</span>
                                        <span className="services-meta-value">{pkg.area}</span>
                                    </div>
                                    <div className="services-meta-item">
                                        <span className="services-meta-label">Ціна</span>
                                        <span className="services-meta-value services-meta-value--price">
                                            {pkg.price}
                                        </span>
                                    </div>
                                    <div className="services-meta-item">
                                        <span className="services-meta-label">Час</span>
                                        <span className="services-meta-value">{pkg.duration}</span>
                                    </div>
                                </div>

                                <ul className="services-card-includes">
                                    {pkg.includes.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>

                                <Link
                                    to="/contacts"
                                    className="secondary-button compact services-card-cta"
                                >
                                    Замовити за {pkg.price}
                                </Link>
                            </article>
                        ))}
                    </div>
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
                        Зберіть замовлення під ваше приміщення — оберіть тип, площу та додаткові опції.
                        Орієнтовну вартість побачите одразу.
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

                            <fieldset className="services-extras">
                                <legend>Додаткові опції</legend>
                                <div className="services-extras-grid">
                                    {customExtras.map((extra) => (
                                        <label key={extra.id} className="services-extra-option">
                                            <input
                                                type="checkbox"
                                                checked={selectedExtras.includes(extra.id)}
                                                onChange={() => toggleExtra(extra.id)}
                                            />
                                            <span className="services-extra-copy">
                                                <span>{extra.label}</span>
                                                <span>+{formatPrice(extra.price)}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <label className="services-field">
                                <span>Коментар</span>
                                <textarea
                                    rows={3}
                                    placeholder="Особливі побажання, час виїзду, доступ до приміщення..."
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                />
                            </label>
                        </form>

                        <aside className="services-custom-summary hero-panel" aria-live="polite">
                            <span className="badge hero-badge">Орієнтовна вартість</span>
                            <p className="services-custom-price">{formatPrice(customEstimate.total)}</p>
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
                            </ul>

                            <Link to="/contacts" className="primary-button services-custom-cta">
                                Підтвердити замовлення
                            </Link>
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

                                <Link
                                    to="/contacts"
                                    className="secondary-button compact services-card-cta"
                                >
                                    Оформити підписку
                                </Link>
                            </article>
                        ))}
                    </div>
                </div>
            )}

            <section className="services-pricing hero-panel" aria-label="Як формується ціна">
                <div className="services-pricing-intro">
                    <span className="badge hero-badge">Ціноутворення</span>
                    <h2 className="hero-process-title">Як ми рахуємо вартість</h2>
                    <p className="hero-text">
                        Фіксовані пакети — для типових площ. Кастомне замовлення — коли потрібен
                        індивідуальний підхід. Підписка — для регулярного догляду. Точну суму
                        називаємо перед виїздом.
                    </p>
                </div>

                <div className="services-pricing-list">
                    {pricingNotes.map((note) => (
                        <article key={note.title} className="services-pricing-item">
                            <h3>{note.title}</h3>
                            <p>{note.text}</p>
                        </article>
                    ))}
                </div>
            </section>

            <header className="services-hero hero-panel">
                <span className="badge hero-badge">Послуги</span>
                <h1 className="services-title">Що ми прибираємо</h1>
                <p className="services-lead">
                    Прозорі ціни, зрозумілий склад робіт і швидкий виїзд. Оберіть послугу — ми
                    уточнимо деталі та підтвердимо вартість перед приїздом.
                </p>
                <div className="services-hero-actions">
                    <Link to="/contacts" className="primary-button">
                        Замовити прибирання
                    </Link>
                    <Link to="/reviews" className="secondary-button">
                        Читати відгуки
                    </Link>
                </div>
            </header>
        </div>
    );
}
