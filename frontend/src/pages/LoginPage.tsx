import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { loginUser, saveAuthUser } from "../api/auth";
import "./AuthPage.css";
import "./HomePage.css";

export default function LoginPage() {
    const navigate = useNavigate();
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrors([]);
        setSuccessMessage("");
        setIsSubmitting(true);

        try {
            const result = await loginUser({ login, password });

            if (!result.success) {
                setErrors(result.errors ?? ["Не вдалося увійти."]);
                return;
            }

            if (result.user) {
                saveAuthUser(result.user);
            }

            setSuccessMessage(result.message ?? "Вхід успішний.");
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
                <h2>Вхід</h2>
                <p>Увійдіть за електронною поштою або номером телефону.</p>
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
                        <span>Електронна пошта або телефон</span>
                        <input
                            value={login}
                            onChange={(event) => setLogin(event.target.value)}
                            placeholder="you@example.com або +380..."
                            autoComplete="username"
                            required
                        />
                    </label>

                    <label>
                        <span>Пароль</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Ваш пароль"
                            autoComplete="current-password"
                            required
                        />
                    </label>

                    <button type="submit" className="primary-button" disabled={isSubmitting}>
                        {isSubmitting ? "Вхід..." : "Увійти"}
                    </button>
                </form>

                <p className="auth-footer">
                    Немає акаунта? <Link to="/register">Зареєструватися</Link>
                </p>
            </div>
        </section>
    );
}
