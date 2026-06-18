import "./HomePage.css";
import { Link } from "react-router-dom";

import BeforeAfterSlider from "../components/home/BeforeAfterSlider";
import CountUpMetric, { MetricRange } from "../components/home/CountUpMetric";
import { HomeIcon, type HomeIconName } from "../components/home/HomeIcons";
import ReviewRatingMetric from "../components/home/ReviewRatingMetric";
import ProcessSteps from "../components/home/ProcessSteps";
import RevealItem from "../components/home/RevealItem";
import TypewriterText from "../components/home/TypewriterText";
import { useHomeScrollReveal } from "../hooks/useHomeScrollReveal";

const highlights: { icon: HomeIconName; title: string; text: string }[] = [
    {
        icon: "rocket",
        title: "Виїзд у день звернення",
        text: "Підбираємо зручний час і приїжджаємо без запізнень.",
    },
    {
        icon: "leaf",
        title: "Безпечні засоби",
        text: "Працюємо акуратно, без різких запахів і пошкоджень.",
    },
    {
        icon: "price",
        title: "Фіксована ціна",
        text: "Домовляємось наперед — без сюрпризів після прибирання.",
    },
];

const guarantees: { icon: HomeIconName; title: string; text: string }[] = [
    {
        icon: "shield",
        title: "Гарантія результату",
        text: "Приймаєте роботу разом із менеджером — фіксуємо якість на місці.",
    },
    {
        icon: "refresh",
        title: "Безкоштовне доопрацювання",
        text: "Якщо щось пропустили — повернемось і виправимо без додаткової оплати.",
    },
    {
        icon: "checklist",
        title: "Чек-лист 50+ пунктів",
        text: "Працюємо за стандартом, щоб нічого важливого не залишилось поза увагою.",
    },
    {
        icon: "chat",
        title: "Підтримка після візиту",
        text: "Залишаємось на зв'язку — відповімо на питання і підкажемо по догляду.",
    },
];

const steps: { icon: HomeIconName; title: string; text: string }[] = [
    {
        icon: "request",
        title: "Заявка",
        text: "Залишаєте заявку — уточнюємо деталі за 2 хвилини.",
    },
    {
        icon: "van",
        title: "Виїзд",
        text: "Приїжджаємо у зручний час із усім необхідним.",
    },
    {
        icon: "sparkle",
        title: "Прибирання",
        text: "Працюємо за чек-листом — акуратно й швидко.",
    },
    {
        icon: "handshake",
        title: "Прийом роботи",
        text: "Показуємо результат і враховуємо побажання.",
    },
];

export default function HomePage() {
    const { homeRef } = useHomeScrollReveal();

    return (
        <div className="home" ref={homeRef}>
            <section className="hero">
                <div className="hero-grid">
                    <div className="hero-panel hero-content home-panel-reveal-top home-panel-reveal-top--left">
                        <div className="hero-content-inner">
                            <div className="hero-intro">
                                <span className="badge hero-badge">
                                    <span className="hero-badge-dot" aria-hidden="true" />
                                    Професійний клінінг
                                </span>

                                <h1>
                                    Чистий дім без стресу
                                    <span className="hero-title-accent">
                                        <TypewriterText text="і зайвих турбот" />
                                    </span>
                                </h1>

                                <p className="hero-text">
                                    Прибираємо квартири, будинки та офіси. Приїжджаємо в зручний час,
                                    працюємо акуратно і залишаємо після себе ідеальну чистоту.
                                </p>

                                <ul className="hero-perks" aria-label="Переваги сервісу">
                                    <li>Без передоплати</li>
                                    <li>Виїзд у день звернення</li>
                                    <li>Еко-засоби</li>
                                </ul>
                            </div>

                            <div className="hero-actions">
                                <Link to="/contacts" className="primary-button hero-cta-primary">
                                    Замовити прибирання
                                    <svg
                                        className="hero-cta-arrow"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M5 12h14" />
                                        <path d="M13 6l6 6-6 6" />
                                    </svg>
                                </Link>
                                <Link to="/services" className="secondary-button">
                                    Наші послуги
                                </Link>
                            </div>

                            <div className="hero-metrics" aria-label="Коротко про сервіс">
                                <ReviewRatingMetric />
                                <MetricRange from={2} to={4} suffix=" год" label="середній час" icon="clock" />
                                <CountUpMetric value={100} suffix="%" label="чек-лист" icon="checklist" />
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

                        <ProcessSteps steps={steps} />
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
                            {highlights.map((item, idx) => (
                                <RevealItem key={item.title} index={idx} className="panel-item reveal-item">
                                    <div className="panel-item-icon" aria-hidden="true">
                                        <HomeIcon name={item.icon} />
                                    </div>
                                    <div className="panel-item-body">
                                        <h3>{item.title}</h3>
                                        <p>{item.text}</p>
                                    </div>
                                </RevealItem>
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
                            {guarantees.map((item, idx) => (
                                <RevealItem key={item.title} index={idx} className="panel-item reveal-item">
                                    <div className="panel-item-icon" aria-hidden="true">
                                        <HomeIcon name={item.icon} />
                                    </div>
                                    <div className="panel-item-body">
                                        <h3>{item.title}</h3>
                                        <p>{item.text}</p>
                                    </div>
                                </RevealItem>
                            ))}
                        </div>

                        <Link to="/reviews" className="secondary-button compact panel-cta">
                            Читати відгуки
                        </Link>
                    </div>
                </div>
            </section>

            <section className="home-result" aria-label="Результат прибирання">
                <div className="hero-panel home-result-panel">
                    <BeforeAfterSlider />
                </div>
            </section>
        </div>
    );
}
