import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { registerUser, saveAuthUser } from "../api/auth";
import "./AuthPage.css";
import "./HomePage.css";

export default function RegisterPage() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrors([]);
        setSuccessMessage("");
        setIsSubmitting(true);

        try {
            const result = await registerUser({
                name,
                email,
                phone,
                password,
                confirmPassword,
            });

            if (!result.success) {
                setErrors(result.errors ?? ["Не вдалося зареєструватися."]);
                return;
            }

            if (result.user) {
                saveAuthUser(result.user);
            }

            setSuccessMessage(result.message ?? "Реєстрація успішна.");
            setTimeout(() => navigate("/"), 1200);
        } catch {
            setErrors(["Помилка з'єднання з сервером. Перевірте, чи запущений backend."]);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="section auth-page">
            <div className="section-head">
                <h2>Реєстрація</h2>
                <p>Створіть обліковий запис, щоб швидше оформлювати замовлення.</p>
            </div>

            <div className="auth-card">
                {errors.length > 0 && (
                    <ul className="auth-errors" role="alert">
                        {errors.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </ul>
                )}

                {successMessage && (
                    <p className="auth-success" role="status">
                        {successMessage}
                    </p>
                )}

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    <label>
                        <span>Ім&apos;я</span>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Ваше ім'я"
                            autoComplete="name"
                            required
                        />
                    </label>

                    <label>
                        <span>Електронна пошта</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                        />
                    </label>

                    <label>
                        <span>Номер телефону</span>
                        <input
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            placeholder="+380501234567"
                            autoComplete="tel"
                            inputMode="tel"
                            required
                        />
                    </label>

                    <label>
                        <span>Пароль</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Мінімум 8 символів"
                            autoComplete="new-password"
                            required
                        />
                    </label>

                    <label>
                        <span>Повторіть пароль</span>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="Ще раз пароль"
                            autoComplete="new-password"
                            required
                        />
                    </label>

                    <button type="submit" className="primary-button" disabled={isSubmitting}>
                        {isSubmitting ? "Реєстрація..." : "Зареєструватися"}
                    </button>
                </form>

                <p className="auth-footer">
                    Вже є акаунт? <Link to="/login">Увійти</Link>
                </p>
            </div>
        </section>
    );
}
