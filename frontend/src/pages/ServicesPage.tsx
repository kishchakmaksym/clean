import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./ServicesPage.css";

const services = [
    {
        icon: "🏠",
        title: "Прибирання квартири",
        text: "Кухня, санвузол, кімнати — акуратно і без поспіху.",
        badge: "Хіт",
    },
    {
        icon: "✨",
        title: "Генеральне прибирання",
        text: "Глибоке прибирання важкодоступних зон і накопиченого бруду.",
        badge: "Pro",
    },
    {
        icon: "🏢",
        title: "Офіси",
        text: "Чистий простір для команди та гідне враження для клієнтів.",
        badge: "B2B",
    },
    {
        icon: "🧱",
        title: "Після ремонту",
        text: "Прибираємо пил, сліди будматеріалів і дрібні залишки.",
        badge: "Після",
    },
    {
        icon: "🪟",
        title: "Миття вікон",
        text: "Скло, рами та підвіконня — без розводів і плям.",
        badge: "Сезон",
    },
    {
        icon: "🧼",
        title: "Підтримуюче",
        text: "Регулярний догляд щотижня або раз на два тижні.",
        badge: "Регулярно",
    },
] as const;

export default function ServicesPage() {
    const [selected, setSelected] = useState<Record<string, boolean>>({});

    const selectedTitles = useMemo(
        () => services.filter((s) => selected[s.title]).map((s) => s.title),
        [selected]
    );

    const toggle = (title: string) => {
        setSelected((prev) => ({ ...prev, [title]: !prev[title] }));
    };

    return (
        <div className="services-page">
            <header className="services-intro panel">
                <div className="services-intro-top">
                    <div>
                        <span className="badge services-badge">Послуги</span>
                        <h1>Оберіть послуги</h1>
                        <p>
                            Відмітьте потрібні пункти — ми підкажемо орієнтовний час і вартість
                            після заявки.
                        </p>
                    </div>
                    <div className="services-intro-actions">
                        <Link to="/contacts" className="primary-button">
                            Залишити заявку
                        </Link>
                        <Link to="/contacts" className="secondary-button">
                            Написати нам
                        </Link>
                    </div>
                </div>
            </header>

            <div className="services-grid" role="group" aria-label="Список послуг">
                {services.map((card) => {
                    const isSelected = Boolean(selected[card.title]);

                    return (
                        <button
                            key={card.title}
                            type="button"
                            className={`service-card ${isSelected ? "is-selected" : ""}`}
                            aria-pressed={isSelected}
                            aria-label={`${card.title}. ${isSelected ? "Обрано" : "Не обрано"}`}
                            onClick={() => toggle(card.title)}
                        >
                            <span className="service-card-badge">{card.badge}</span>
                            <span className="service-card-icon" aria-hidden="true">
                                {card.icon}
                            </span>
                            <span className="service-card-title">{card.title}</span>
                            <span className="service-card-text">{card.text}</span>
                            <span className="service-card-check" aria-hidden="true">
                                {isSelected ? "✓" : ""}
                            </span>
                        </button>
                    );
                })}
            </div>

            <footer className="services-selection panel" aria-label="Обрані послуги">
                <div className="services-selection-info">
                    <p className="services-selection-label">Обрано</p>
                    <p className="services-selection-text">
                        {selectedTitles.length
                            ? selectedTitles.join(" · ")
                            : "Натисніть на картку, щоб обрати послугу"}
                    </p>
                </div>
                <div className="services-selection-actions">
                    <Link to="/contacts" className="secondary-button compact">
                        Замовити
                    </Link>
                    <Link to="/contacts" className="primary-button compact">
                        Розрахувати
                    </Link>
                </div>
            </footer>
        </div>
    );
}
