import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import "./ServicesPage.css";

const services = [
    {
        icon: "🏠",
        title: "Прибирання квартири",
        text: "Кухня, санвузол, кімнати",
        badge: "Хіт",
        size: "lg",
        x: 6,
        y: 8,
        delay: 0,
        duration: 5.2,
    },
    {
        icon: "✨",
        title: "Генеральне",
        text: "Глибоке прибирання",
        badge: "Pro",
        size: "xl",
        x: 38,
        y: 2,
        delay: 0.8,
        duration: 6.1,
    },
    {
        icon: "🏢",
        title: "Офіси",
        text: "Для команд і клієнтів",
        badge: "B2B",
        size: "md",
        x: 72,
        y: 18,
        delay: 1.4,
        duration: 4.8,
    },
    {
        icon: "🧱",
        title: "Після ремонту",
        text: "Пил і будівельні залишки",
        badge: "Після",
        size: "md",
        x: 10,
        y: 48,
        delay: 0.3,
        duration: 5.6,
    },
    {
        icon: "🪟",
        title: "Миття вікон",
        text: "Скло без розводів",
        badge: "Сезон",
        size: "sm",
        x: 46,
        y: 52,
        delay: 1.1,
        duration: 4.4,
    },
    {
        icon: "🧼",
        title: "Підтримуюче",
        text: "Щотижня або раз на 2 тижні",
        badge: "Регулярно",
        size: "lg",
        x: 68,
        y: 58,
        delay: 1.9,
        duration: 5.9,
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
        <section className="section services-page">
            <div className="section-head row">
                <div>
                    <span className="badge">Послуги</span>
                    <h2>Оберіть бульбашки</h2>
                    <p>
                        Натисни на бульбашку, щоб <strong>обрати послугу</strong>. Потім перейди до
                        розрахунку.
                    </p>
                </div>
                <div className="section-head-actions">
                    <Link to="/prices" className="primary-button">
                        Розрахувати
                    </Link>
                    <Link to="/contacts" className="secondary-button">
                        Написати нам
                    </Link>
                </div>
            </div>

            <div className="bubble-field" aria-label="Список послуг у вигляді бульбашок">
                <div className="bubble-decor bubble-decor--1" aria-hidden="true" />
                <div className="bubble-decor bubble-decor--2" aria-hidden="true" />
                <div className="bubble-decor bubble-decor--3" aria-hidden="true" />
                <div className="bubble-decor bubble-decor--4" aria-hidden="true" />

                {services.map((card) => {
                    const isSelected = Boolean(selected[card.title]);
                    const style = {
                        "--bx": `${card.x}%`,
                        "--by": `${card.y}%`,
                        "--float-delay": `${card.delay}s`,
                        "--float-duration": `${card.duration}s`,
                    } as CSSProperties;

                    return (
                        <button
                            key={card.title}
                            type="button"
                            className={`soap-bubble soap-bubble--${card.size} ${isSelected ? "is-selected" : ""}`}
                            style={style}
                            aria-pressed={isSelected}
                            aria-label={`${card.title}. ${isSelected ? "Обрано" : "Не обрано"}`}
                            onClick={() => toggle(card.title)}
                        >
                            <span className="soap-bubble__rim" aria-hidden="true" />
                            <span className="soap-bubble__shine soap-bubble__shine--main" aria-hidden="true" />
                            <span className="soap-bubble__shine soap-bubble__shine--sub" aria-hidden="true" />

                            <span className="soap-bubble__badge">{card.badge}</span>

                            <span className="soap-bubble__content">
                                <span className="soap-bubble__icon" aria-hidden="true">
                                    {card.icon}
                                </span>
                                <span className="soap-bubble__title">{card.title}</span>
                                <span className="soap-bubble__text">{card.text}</span>
                            </span>

                            <span className="soap-bubble__check" aria-hidden="true">
                                {isSelected ? "✓" : "+"}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="selection-bar glass-strong" aria-label="Обрані послуги">
                <div>
                    <div className="selection-title">Обрано</div>
                    <div className="selection-text">
                        {selectedTitles.length ? selectedTitles.join(" · ") : "Торкнись бульбашки, щоб обрати"}
                    </div>
                </div>
                <div className="selection-actions">
                    <Link to="/contacts" className="secondary-button compact">
                        Замовити
                    </Link>
                    <Link to="/prices" className="primary-button compact">
                        Розрахувати
                    </Link>
                </div>
            </div>
        </section>
    );
}
