import { type FormEvent, useState } from "react";

import { submitJobApplication } from "../api/jobApplications";
import "./VacanciesPage.css";

export default function VacanciesPage() {
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [age, setAge] = useState("");
    const [experience, setExperience] = useState("");
    const [about, setAbout] = useState("");
    const [errors, setErrors] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrors([]);
        setSuccessMessage("");
        setIsSubmitting(true);

        const parsedAge = Number(age.trim());

        if (!age.trim() || Number.isNaN(parsedAge)) {
            setErrors(["Вкажіть вік (можна з 16 років)."]);
            setIsSubmitting(false);
            return;
        }

        try {
            const result = await submitJobApplication({
                fullName,
                phone,
                age: parsedAge,
                experience,
                about,
            });

            if (!result.success) {
                setErrors(result.errors ?? ["Не вдалося надіслати заявку."]);
                return;
            }

            setSuccessMessage(result.message ?? "Заявку надіслано.");
            setFullName("");
            setPhone("");
            setAge("");
            setExperience("");
            setAbout("");
        } catch {
            setErrors(["Помилка з'єднання з сервером."]);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="vacancies-page">
            <section className="vacancies-hero hero-panel">
                <span className="badge hero-badge">Вакансії</span>
                <h1 className="vacancies-title">Робота в Smart Clean</h1>
                <p className="vacancies-lead">
                    Шукаємо відповідальних прибиральниць у команду. Стабільні замовлення, гнучкий графік
                    з 8:00 до 20:00, все необхідне для роботи надаємо.
                </p>
            </section>

            <section className="vacancies-job hero-panel">
                <h2 className="vacancies-section-title">Прибиральниця</h2>
                <ul className="vacancies-list">
                    <li>Прибирання квартир, будинків та офісів у Ужгороді та околицях</li>
                    <li>Робота за чек-листом — акуратно й якісно</li>
                    <li>Робочий день з 8:00 до 20:00 — без постійного графіка, повністю гнучкий</li>
                    <li>Ви самі обираєте, коли брати замовлення — залежить лише від вас</li>
                    <li>Оплата після виконання замовлення</li>
                </ul>
                <p className="vacancies-note">
                    Якщо вам подобається чистота, ви пунктуальні та уважні до деталей — заповніть форму нижче.
                </p>
            </section>

            <section className="vacancies-form-card hero-panel">
                <h2 className="vacancies-section-title">Подати заявку</h2>
                <p className="vacancies-form-lead">Залиште контакти — ми передзвонимо протягом 1–2 днів.</p>

                <form className="vacancies-form" onSubmit={handleSubmit}>
                    <label>
                        <span>Ім&apos;я та прізвище *</span>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(event) => setFullName(event.target.value)}
                            autoComplete="name"
                            required
                            maxLength={100}
                        />
                    </label>

                    <label>
                        <span>Телефон *</span>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            autoComplete="tel"
                            placeholder="+380..."
                            required
                            maxLength={20}
                        />
                    </label>

                    <label>
                        <span>Вік * (можна з 16 років)</span>
                        <input
                            type="number"
                            min={16}
                            max={70}
                            value={age}
                            onChange={(event) => setAge(event.target.value)}
                            placeholder="16"
                            required
                        />
                    </label>

                    <label>
                        <span>Досвід роботи</span>
                        <textarea
                            value={experience}
                            onChange={(event) => setExperience(event.target.value)}
                            rows={4}
                            maxLength={2000}
                            placeholder="Де працювали, скільки років досвіду..."
                        />
                    </label>

                    <label>
                        <span>Про себе</span>
                        <textarea
                            value={about}
                            onChange={(event) => setAbout(event.target.value)}
                            rows={4}
                            maxLength={2000}
                            placeholder="Чому хочете працювати з нами, зручний графік..."
                        />
                    </label>

                    {errors.length > 0 ? (
                        <ul className="vacancies-errors" role="alert">
                            {errors.map((error) => (
                                <li key={error}>{error}</li>
                            ))}
                        </ul>
                    ) : null}

                    {successMessage ? (
                        <p className="vacancies-success" role="status">
                            {successMessage}
                        </p>
                    ) : null}

                    <button type="submit" className="primary-button" disabled={isSubmitting}>
                        {isSubmitting ? "Надсилання…" : "Надіслати заявку"}
                    </button>
                </form>
            </section>
        </div>
    );
}
