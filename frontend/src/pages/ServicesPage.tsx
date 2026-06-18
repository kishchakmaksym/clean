import { Link } from "react-router-dom";

import "./HomePage.css";
import "./ServicesPage.css";

const services = [
    {
        icon: "🏠",
        title: "Прибирання квартири",
        text: "Щоденний догляд за житлом: кухня, санвузол, кімнати — акуратно і без поспіху.",
        badge: "Популярне",
        priceFrom: "від 800 ₴",
        duration: "2–4 год",
        includes: ["Вологе прибирання поверхонь", "Пилосос і миття підлоги", "Санвузол і кухня", "Винесення сміття"],
    },
    {
        icon: "✨",
        title: "Генеральне прибирання",
        text: "Глибоке прибирання важкодоступних зон, накопиченого бруду та дрібних деталей.",
        badge: "Глибоке",
        priceFrom: "від 1 500 ₴",
        duration: "4–8 год",
        includes: ["Внутрішні поверхні шаф", "Плінтуси та батареї", "Скло та дзеркала", "Дезінфекція санвузла"],
    },
    {
        icon: "🏢",
        title: "Офіси",
        text: "Чистий простір для команди та гідне враження для клієнтів і партнерів.",
        badge: "B2B",
        priceFrom: "від 1 200 ₴",
        duration: "2–6 год",
        includes: ["Робочі зони і переговорні", "Кухня та санвузли", "Прибирання за графіком", "Договір для компаній"],
    },
    {
        icon: "🧱",
        title: "Після ремонту",
        text: "Прибираємо будівельний пил, сліди матеріалів і дрібні залишки після робіт.",
        badge: "Складне",
        priceFrom: "від 2 000 ₴",
        duration: "6–12 год",
        includes: ["Пил після ремонту", "Вікна та підвіконня", "Плитка і шви", "Фінальна поліровка"],
    },
    {
        icon: "🪟",
        title: "Миття вікон",
        text: "Скло, рами та підвіконня — без розводів, плям і розводів від засобів.",
        badge: "Окремо",
        priceFrom: "від 400 ₴",
        duration: "1–3 год",
        includes: ["Скло з обох боків", "Рами та фурнітура", "Підвіконня", "Можна додати до замовлення"],
    },
    {
        icon: "🧼",
        title: "Підтримуюче",
        text: "Регулярний догляд щотижня або раз на два тижні — завжди охайно вдома.",
        badge: "Регулярно",
        priceFrom: "від 600 ₴",
        duration: "1.5–3 год",
        includes: ["Фіксований графік", "Той самий виконавець", "Знижка при абонементі", "Пріоритет у записі"],
    },
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

export default function ServicesPage() {
    return (
        <div className="services-page">
            <header className="services-hero hero-panel">
                <span className="badge hero-badge">Послуги</span>
                <h1 className="services-title">Що ми прибираємо</h1>
                <p className="services-lead">
                    Прозорі ціни, зрозумілий склад робіт і швидкий виїзд. Оберіть послугу —
                    ми уточнимо деталі та підтвердимо вартість перед приїздом.
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

            <div className="services-grid">
                {services.map((service) => (
                    <article key={service.title} className="services-card hero-panel">
                        <div className="services-card-head">
                            <div className="services-card-icon" aria-hidden="true">
                                {service.icon}
                            </div>
                            <span className="services-card-badge">{service.badge}</span>
                        </div>

                        <h2 className="services-card-title">{service.title}</h2>
                        <p className="services-card-text">{service.text}</p>

                        <div className="services-card-meta">
                            <div className="services-meta-item">
                                <span className="services-meta-label">Ціна</span>
                                <span className="services-meta-value">{service.priceFrom}</span>
                            </div>
                            <div className="services-meta-item">
                                <span className="services-meta-label">Час</span>
                                <span className="services-meta-value">{service.duration}</span>
                            </div>
                        </div>

                        <ul className="services-card-includes">
                            {service.includes.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>

                        <Link
                            to="/contacts"
                            className="secondary-button compact services-card-cta"
                        >
                            Замовити
                        </Link>
                    </article>
                ))}
            </div>

            <section className="services-pricing hero-panel" aria-label="Як формується ціна">
                <div className="services-pricing-intro">
                    <span className="badge hero-badge">Ціноутворення</span>
                    <h2 className="hero-process-title">Як ми рахуємо вартість</h2>
                    <p className="hero-text">
                        Орієнтовні ціни в картках — для типових замовлень. Точну суму
                        називаємо після короткої консультації.
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

            <section className="cta services-cta">
                <div>
                    <h2>Не знаєте, що обрати?</h2>
                    <p>Напишіть нам — підберемо послугу під ваш об’єкт і бюджет без зобов’язань.</p>
                </div>
                <Link to="/contacts" className="primary-button">
                    Отримати консультацію
                </Link>
            </section>
        </div>
    );
}
