import "./HomePage.css";
import { Link } from "react-router-dom";

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

const steps = [
    { title: "Заявка", text: "Залишаєте заявку — уточнюємо деталі за 2 хвилини." },
    { title: "Виїзд", text: "Приїжджаємо у зручний час із усім необхідним." },
    { title: "Прибирання", text: "Працюємо за чек-листом — акуратно й швидко." },
    { title: "Прийом роботи", text: "Показуємо результат і враховуємо побажання." },
];

export default function HomePage() {
    return (
        <div className="home">
            <section className="hero">
                <div className="hero-grid">
                    <div className="hero-panel hero-content">
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

                    <div className="hero-panel hero-process">
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

            <section className="section">
                <div className="section-head">
                    <span className="badge">Переваги</span>
                    <h2>Чому нас обирають</h2>
                    <p>Акуратність, пунктуальність і стабільна якість — без компромісів.</p>
                </div>

                <div className="grid-3">
                    {highlights.map((item) => (
                        <article key={item.title} className="glass-card info-card">
                            <div className="info-icon" aria-hidden="true">
                                {item.icon}
                            </div>
                            <h3>{item.title}</h3>
                            <p>{item.text}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="section">
                <div className="cta">
                    <div>
                        <h2>Готові до чистоти вже сьогодні?</h2>
                        <p>Напишіть нам — підкажемо послугу, зорієнтуємо по часу та вартості.</p>
                    </div>
                    <Link to="/contacts" className="primary-button">
                        Залишити заявку
                    </Link>
                </div>
            </section>
        </div>
    );
}
