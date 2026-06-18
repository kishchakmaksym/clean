import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
    createAdminReview,
    createReview,
    fetchReviews,
    formatReviewDate,
    renderStars,
} from "../api/reviews";
import type { ReviewDto } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import "./HomePage.css";
import "./ReviewsPage.css";

function todayInputValue() {
    return new Date().toISOString().slice(0, 10);
}

export default function ReviewsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "Admin";
    const canLeaveRegularReview = user && !isAdmin;

    const [reviews, setReviews] = useState<ReviewDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [rating, setRating] = useState(0);
    const [text, setText] = useState("");
    const [authorName, setAuthorName] = useState("");
    const [reviewDate, setReviewDate] = useState(todayInputValue);
    const [errors, setErrors] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadReviews = useCallback(async () => {
        setIsLoading(true);
        setLoadError("");

        try {
            const data = await fetchReviews();
            setReviews(data);
        } catch {
            setLoadError("Не вдалося завантажити відгуки. Перевірте, чи запущений backend.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadReviews();
    }, [loadReviews]);

    async function handleRegularSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!user) {
            return;
        }

        setErrors([]);
        setSuccessMessage("");
        setIsSubmitting(true);

        try {
            const result = await createReview({
                userId: user.id,
                rating,
                text,
            });

            if (!result.success) {
                setErrors(result.errors ?? ["Не вдалося опублікувати відгук."]);
                return;
            }

            setSuccessMessage(result.message ?? "Відгук опубліковано.");
            setRating(0);
            setText("");
            await loadReviews();
        } catch {
            setErrors(["Помилка з'єднання з сервером."]);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleAdminSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!user) {
            return;
        }

        setErrors([]);
        setSuccessMessage("");
        setIsSubmitting(true);

        try {
            const result = await createAdminReview({
                userId: user.id,
                authorName,
                rating,
                text,
                createdAtUtc: new Date(`${reviewDate}T12:00:00`).toISOString(),
            });

            if (!result.success) {
                setErrors(result.errors ?? ["Не вдалося додати відгук."]);
                return;
            }

            setSuccessMessage(result.message ?? "Відгук додано.");
            setAuthorName("");
            setRating(0);
            setText("");
            setReviewDate(todayInputValue());
            await loadReviews();
        } catch {
            setErrors(["Помилка з'єднання з сервером."]);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="section reviews-layout">
            <div className="section-head">
                <span className="badge">Відгуки</span>
                <h2>Що кажуть клієнти</h2>
                <p>Реальні враження від наших клієнтів.</p>
            </div>

            <div className="review-form-card">
                <h3>{isAdmin ? "Додати відгук (адмін)" : "Залишити відгук"}</h3>

                {isAdmin ? (
                    <form className="review-form" onSubmit={handleAdminSubmit} noValidate>
                        {errors.length > 0 && (
                            <ul className="review-errors" role="alert">
                                {errors.map((error) => (
                                    <li key={error}>{error}</li>
                                ))}
                            </ul>
                        )}

                        {successMessage && (
                            <p className="review-success" role="status">
                                {successMessage}
                            </p>
                        )}

                        <label>
                            <span>Ім&apos;я клієнта</span>
                            <input
                                value={authorName}
                                onChange={(event) => setAuthorName(event.target.value)}
                                placeholder="Наприклад, Олена"
                                required
                            />
                        </label>

                        <div>
                            <span className="review-form-label">Оцінка</span>
                            <div className="star-rating" role="radiogroup" aria-label="Оцінка від 1 до 5 зірок">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={`star-button${value <= rating ? " is-active" : ""}`}
                                        aria-label={`${value} зірок`}
                                        aria-pressed={value <= rating}
                                        onClick={() => setRating(value)}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label>
                            <span>Текст відгуку</span>
                            <textarea
                                value={text}
                                onChange={(event) => setText(event.target.value)}
                                placeholder="Текст відгуку для сайту..."
                                rows={4}
                                required
                            />
                        </label>

                        <label>
                            <span>Дата</span>
                            <input
                                type="date"
                                value={reviewDate}
                                onChange={(event) => setReviewDate(event.target.value)}
                                required
                            />
                        </label>

                        <button type="submit" className="primary-button" disabled={isSubmitting}>
                            {isSubmitting ? "Додавання..." : "Додати відгук"}
                        </button>
                    </form>
                ) : canLeaveRegularReview ? (
                    <form className="review-form" onSubmit={handleRegularSubmit} noValidate>
                        {errors.length > 0 && (
                            <ul className="review-errors" role="alert">
                                {errors.map((error) => (
                                    <li key={error}>{error}</li>
                                ))}
                            </ul>
                        )}

                        {successMessage && (
                            <p className="review-success" role="status">
                                {successMessage}
                            </p>
                        )}

                        <label>
                            <span>Ім&apos;я</span>
                            <input value={user.name} readOnly aria-readonly="true" />
                        </label>

                        <div>
                            <span className="review-form-label">Оцінка</span>
                            <div className="star-rating" role="radiogroup" aria-label="Оцінка від 1 до 5 зірок">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={`star-button${value <= rating ? " is-active" : ""}`}
                                        aria-label={`${value} зірок`}
                                        aria-pressed={value <= rating}
                                        onClick={() => setRating(value)}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label>
                            <span>Ваш відгук</span>
                            <textarea
                                value={text}
                                onChange={(event) => setText(event.target.value)}
                                placeholder="Розкажіть про свій досвід..."
                                rows={4}
                                required
                            />
                        </label>

                        <button type="submit" className="primary-button" disabled={isSubmitting}>
                            {isSubmitting ? "Публікація..." : "Опублікувати"}
                        </button>
                    </form>
                ) : (
                    <p className="review-guest-hint">
                        Щоб залишити відгук,{" "}
                        <Link to="/login">увійдіть</Link> або{" "}
                        <Link to="/login">зареєструйтесь</Link>.
                    </p>
                )}
            </div>

            {isLoading && <p className="reviews-empty">Завантаження відгуків...</p>}
            {loadError && <p className="review-load-error">{loadError}</p>}

            {!isLoading && !loadError && reviews.length === 0 && (
                <p className="reviews-empty">Поки що немає відгуків. Будьте першим!</p>
            )}

            {!isLoading && !loadError && reviews.length > 0 && (
                <div className="grid-3">
                    {reviews.map((review) => (
                        <article key={review.id} className="glass-card info-card">
                            <div className="review-stars-display" aria-label={`Оцінка ${review.rating} з 5`}>
                                {renderStars(review.rating)}
                            </div>
                            <h3>{review.authorName}</h3>
                            <p>{review.text}</p>
                            <p className="review-meta">{formatReviewDate(review.createdAtUtc)}</p>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
