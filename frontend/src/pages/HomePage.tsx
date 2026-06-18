import "./HomePage.css";
import { Link } from "react-router-dom";

import { useHomeScrollReveal } from "../hooks/useHomeScrollReveal";

const highlights = [
    {
        icon: "🚀",
        title: "Виїзд у день звернення",
        text: "Підбираємо зручний час і приїжджаємо без запізнень.",
    },
    {
        icon: "🌿",
        title: "Безпечні засоби",
        text: "Працюємо акуратно, без різких запахів і пошкоджень.",
    },
    {
        icon: "✓",
        title: "Фіксована ціна",
        text: "Домовляємось наперед — без сюрпризів після прибирання.",
    },
];

const guarantees = [
    {
        icon: "🛡️",
        title: "Гарантія результату",
        text: "Приймаєте роботу разом із менеджером — фіксуємо якість на місці.",
    },
    {
        icon: "↩️",
        title: "Безкоштовне доопрацювання",
        text: "Якщо щось пропустили — повернемось і виправимо без додаткової оплати.",
    },
    {
        icon: "📋",
        title: "Чек-лист 50+ пунктів",
        text: "Працюємо за стандартом, щоб нічого важливого не залишилось поза увагою.",
    },
    {
        icon: "💬",
        title: "Підтримка після візиту",
        text: "Залишаємось на зв'язку — відповімо на питання і підкажемо по догляду.",
    },
];

const steps = [
    { title: "Заявка", text: "Залишаєте заявку — уточнюємо деталі за 2 хвилини." },
    { title: "Виїзд", text: "Приїжджаємо у зручний час із усім необхідним." },
    { title: "Прибирання", text: "Працюємо за чек-листом — акуратно й швидко." },
    { title: "Прийом роботи", text: "Показуємо результат і враховуємо побажання." },
];

export default function HomePage() {
    const { homeRef } = useHomeScrollReveal();

    return (
        <div className="home" ref={homeRef}>
            <section className="hero">
                <div className="hero-grid">
                    <div className="hero-panel hero-content home-panel-reveal-top home-panel-reveal-top--left">
                        <div className="hero-intro">
                            <span className="badge hero-badge">Професійний клінінг</span>

                            <h1>
                                Чистий дім без стресу
                                <span>і зайвих турбот</span>
                            </h1>

                            <p className="hero-text">
                                Прибираємо квартири, будинки та офіси. Приїжджаємо в зручний час,
                                працюємо акуратно і залишаємо після себе ідеальну чистоту.
                            </p>
                        </div>

                        <div className="hero-actions">
                            <Link to="/contacts" className="primary-button">
                                Замовити прибирання
                            </Link>
                            <Link to="/services" className="secondary-button">
                                Наші послуги
                            </Link>
                        </div>

                        <div className="hero-metrics" aria-label="Коротко про сервіс">
                            <div className="metric">
                                <div className="metric-value">4.9</div>
                                <div className="metric-label">рейтинг</div>
                            </div>
                            <div className="metric">
                                <div className="metric-value">2–4 год</div>
                                <div className="metric-label">середній час</div>
                            </div>
                            <div className="metric">
                                <div className="metric-value">100%</div>
                                <div className="metric-label">чек-лист</div>
                            </div>
                        </div>
                    </div>

                    <div className="hero-panel hero-process home-panel-reveal-top home-panel-reveal-top--right">
                        <div className="hero-intro">
                            <span className="badge hero-badge">Процес</span>
                            <h2 className="hero-process-title">Як ми працюємо</h2>
                            <p className="hero-text">
                                Прозорий процес: від заявки до ідеальної чистоти.
                            </p>
                        </div>

                        <div className="hero-steps">
                            {steps.map((step, idx) => (
                                <article key={step.title} className="hero-step">
                                    <div className="hero-step-number">
                                        {String(idx + 1).padStart(2, "0")}
                                    </div>
                                    <div className="hero-step-body">
                                        <h3>{step.title}</h3>
                                        <p>{step.text}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="home-bottom">
                <div className="hero-grid home-bottom-grid">
                    <div className="hero-panel hero-benefits home-panel-reveal home-panel-reveal--left">
                        <div className="hero-intro">
                            <span className="badge hero-badge">Переваги</span>
                            <h2 className="hero-process-title">Чому нас обирають</h2>
                            <p className="hero-text">
                                Акуратність, пунктуальність і стабільна якість — без компромісів.
                            </p>
                        </div>

                        <div className="panel-list">
                            {highlights.map((item) => (
                                <article key={item.title} className="panel-item">
                                    <div className="panel-item-icon" aria-hidden="true">
                                        {item.icon}
                                    </div>
                                    <div className="panel-item-body">
                                        <h3>{item.title}</h3>
                                        <p>{item.text}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>

                    <div className="hero-panel hero-guarantee home-panel-reveal home-panel-reveal--right">
                        <div className="hero-intro">
                            <span className="badge hero-badge">Надійність</span>
                            <h2 className="hero-process-title">Гарантія якості</h2>
                            <p className="hero-text">
                                Ви платите за результат — ми відповідаємо за кожен етап прибирання.
                            </p>
                        </div>

                        <div className="panel-list">
                            {guarantees.map((item) => (
                                <article key={item.title} className="panel-item">
                                    <div className="panel-item-icon" aria-hidden="true">
                                        {item.icon}
                                    </div>
                                    <div className="panel-item-body">
                                        <h3>{item.title}</h3>
                                        <p>{item.text}</p>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <Link to="/reviews" className="secondary-button compact panel-cta">
                            Читати відгуки
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
