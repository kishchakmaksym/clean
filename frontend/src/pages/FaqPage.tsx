import FaqAccordion from "../components/faq/FaqAccordion";
import { supportContacts } from "../config/contacts";
import "./HomePage.css";
import "./FaqPage.css";

export default function FaqPage() {
    return (
        <div className="faq-page">
            <section className="faq-hero hero-panel">
                <span className="badge hero-badge">FAQ</span>
                <h1 className="faq-hero-title">Часті питання</h1>
                <p className="faq-hero-text">
                    Зібрали відповіді на те, що клієнти питають найчастіше. Не знайшли потрібне — напишіть
                    або зателефонуйте нам.
                </p>
            </section>

            <FaqAccordion />

            <section className="faq-contact hero-panel">
                <h2 className="faq-contact-title">Залишились питання?</h2>
                <p className="faq-contact-text">Ми на зв&apos;язку щодня — допоможемо з замовленням і деталями.</p>
                <div className="faq-contact-actions">
                    <a href={supportContacts.phoneHref} className="primary-button">
                        {supportContacts.phoneDisplay}
                    </a>
                    <a href={supportContacts.emailHref} className="secondary-button">
                        {supportContacts.email}
                    </a>
                </div>
            </section>
        </div>
    );
}
