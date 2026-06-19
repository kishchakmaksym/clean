import { type FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { loginUser, registerUser } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import "./AuthPage.css";
import "./HomePage.css";

type AuthMode = "login" | "register";

export default function AuthPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isEmployeeLogin = searchParams.get("for") === "employee";
    const { setUser } = useAuth();
    const [mode, setMode] = useState<AuthMode>("login");

    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [errors, setErrors] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    function switchMode(nextMode: AuthMode) {
        setMode(nextMode);
        setErrors([]);
        setSuccessMessage("");
    }

    async function handleLogin(event: FormEvent<HTMLFormElement>) {
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
                setUser(result.user);
            }

            setSuccessMessage(result.message ?? "Вхід успішний.");
            const returnTo = searchParams.get("returnTo");
            setTimeout(() => navigate(returnTo && returnTo.startsWith("/") ? returnTo : "/"), 1200);
        } catch {
            setErrors(["Помилка з'єднання з сервером. Перевірте, чи запущений backend."]);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleRegister(event: FormEvent<HTMLFormElement>) {
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
                setUser(result.user);
            }

            setSuccessMessage(result.message ?? "Реєстрація успішна.");
            const returnTo = searchParams.get("returnTo");
            setTimeout(() => navigate(returnTo && returnTo.startsWith("/") ? returnTo : "/"), 1200);
        } catch {
            setErrors(["Помилка з'єднання з сервером. Перевірте, чи запущений backend."]);
        } finally {
            setIsSubmitting(false);
        }
    }

    const isLogin = mode === "login";
    const showLoginForm = isEmployeeLogin || isLogin;

    return (
        <section className="section auth-page">
            <div className="section-head">
                <h2>
                    {isEmployeeLogin
                        ? "Вхід для прибиральниць"
                        : isLogin
                          ? "Вхід"
                          : "Реєстрація"}
                </h2>
                <p>
                    {isEmployeeLogin
                        ? "Увійдіть до кабінету виконавця за вашими даними."
                        : isLogin
                          ? "Увійдіть за електронною поштою або номером телефону."
                          : "Створіть обліковий запис, щоб швидше оформлювати замовлення."}
                </p>
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

                {showLoginForm ? (
                    <form className="auth-form" onSubmit={handleLogin} noValidate>
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
                ) : (
                    <form className="auth-form" onSubmit={handleRegister} noValidate>
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
                )}

                <p className="auth-footer">
                    {isEmployeeLogin ? (
                        <>
                            Потрібен акаунт клієнта?{" "}
                            <button type="button" className="auth-toggle" onClick={() => navigate("/login")}>
                                Звичайний вхід
                            </button>
                        </>
                    ) : isLogin ? (
                        <>
                            Немає акаунта?{" "}
                            <button type="button" className="auth-toggle" onClick={() => switchMode("register")}>
                                Зареєструватися
                            </button>
                        </>
                    ) : (
                        <>
                            Вже є акаунт?{" "}
                            <button type="button" className="auth-toggle" onClick={() => switchMode("login")}>
                                Увійти
                            </button>
                        </>
                    )}
                </p>
            </div>
        </section>
    );
}
