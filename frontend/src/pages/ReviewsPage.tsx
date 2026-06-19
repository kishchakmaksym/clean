import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
    createAdminReview,
    createReview,
    deleteAdminReview,
    fetchReviews,
    formatReviewDate,
    mergeReviewAtTop,
    renderStars,
} from "../api/reviews";
import type { ReviewDto } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ukraineLocalDateTimeToUtcIso, ukraineTodayInputValue } from "../utils/dateTime";
import "./HomePage.css";
import "./ReviewsPage.css";

function todayInputValue() {
    return ukraineTodayInputValue();
}

const REVIEW_PREVIEW_WORDS = 36;

function countWords(text: string) {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function truncateWords(text: string, maxWords: number) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) {
        return text;
    }

    return `${words.slice(0, maxWords).join(" ")}…`;
}

function ReviewText({ text }: { text: string }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isLong = countWords(text) > REVIEW_PREVIEW_WORDS;

    if (!isLong) {
        return <p className="review-text">{text}</p>;
    }

    return (
        <div className="review-text-block">
            <p className="review-text">{isExpanded ? text : truncateWords(text, REVIEW_PREVIEW_WORDS)}</p>
            <button
                type="button"
                className="review-toggle"
                onClick={() => setIsExpanded((value) => !value)}
                aria-expanded={isExpanded}
            >
                {isExpanded ? "Читати менше" : "Читати більше"}
            </button>
        </div>
    );
}

export default function ReviewsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "Admin";
    const isEmployee = user?.role === "Employee";
    const canLeaveRegularReview = user?.role === "User";

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
    const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
    const [pendingDeleteReview, setPendingDeleteReview] = useState<ReviewDto | null>(null);
    const reviewsTopRef = useRef<HTMLDivElement>(null);

    const loadReviews = useCallback(async (options?: { silent?: boolean }) => {
        if (!options?.silent) {
            setIsLoading(true);
        }
        setLoadError("");

        try {
            const data = await fetchReviews();
            setReviews(data);
        } catch {
            setLoadError("Не вдалося завантажити відгуки. Перевірте, чи запущений backend.");
        } finally {
            if (!options?.silent) {
                setIsLoading(false);
            }
        }
    }, []);

    const showNewReviewAtTop = useCallback((review: ReviewDto) => {
        setReviews((current) => mergeReviewAtTop(current, review));
        requestAnimationFrame(() => {
            reviewsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
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

            if (result.review) {
                showNewReviewAtTop(result.review);
            } else {
                await loadReviews({ silent: true });
            }
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
                createdAtUtc: ukraineLocalDateTimeToUtcIso(reviewDate),
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

            if (result.review) {
                showNewReviewAtTop(result.review);
            } else {
                await loadReviews({ silent: true });
            }
        } catch {
            setErrors(["Помилка з'єднання з сервером."]);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteReview(reviewId: string) {
        if (!user || !isAdmin) {
            return;
        }

        setErrors([]);
        setSuccessMessage("");
        setDeletingReviewId(reviewId);

        try {
            const result = await deleteAdminReview({
                userId: user.id,
                reviewId,
            });

            if (!result.success) {
                setErrors(result.errors ?? ["Не вдалося видалити відгук."]);
                return;
            }

            setSuccessMessage(result.message ?? "Відгук видалено.");
            setPendingDeleteReview(null);
            await loadReviews();
        } catch {
            setErrors(["Помилка з'єднання з сервером."]);
        } finally {
            setDeletingReviewId(null);
        }
    }

    function requestDeleteReview(review: ReviewDto) {
        setPendingDeleteReview(review);
    }

    return (
        <div className="reviews-page reviews-layout">
            {pendingDeleteReview && (
                <div className="review-modal-backdrop" role="presentation" onClick={() => setPendingDeleteReview(null)}>
                    <div
                        className="review-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-review-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3 id="delete-review-title">Видалити відгук?</h3>
                        <p>
                            Ви впевнені, що хочете видалити відгук від{" "}
                            <strong>{pendingDeleteReview.authorName}</strong>? Цю дію не можна скасувати.
                        </p>
                        <div className="review-modal-actions">
                            <button
                                type="button"
                                className="secondary-button compact"
                                onClick={() => setPendingDeleteReview(null)}
                                disabled={deletingReviewId === pendingDeleteReview.id}
                            >
                                Скасувати
                            </button>
                            <button
                                type="button"
                                className="review-delete-button review-delete-button-confirm"
                                disabled={deletingReviewId === pendingDeleteReview.id}
                                onClick={() => void handleDeleteReview(pendingDeleteReview.id)}
                            >
                                {deletingReviewId === pendingDeleteReview.id ? "Видалення..." : "Так, видалити"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                ) : isEmployee ? (
                    <p className="review-employee-hint">
                        Ви увійшли як працівник, тому не можете залишати відгук у цьому розділі.
                    </p>
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

            <div ref={reviewsTopRef} className="reviews-list-anchor">
                {isLoading && <p className="reviews-empty">Завантаження відгуків...</p>}
                {loadError && <p className="review-load-error">{loadError}</p>}

                {!isLoading && !loadError && reviews.length === 0 && (
                    <p className="reviews-empty">Поки що немає відгуків. Будьте першим!</p>
                )}

                {!isLoading && !loadError && reviews.length > 0 && (
                    <div className="reviews-grid">
                        {reviews.map((review) => (
                            <article key={review.id} className="glass-card info-card review-card">
                                <div className="review-stars-display" aria-label={`Оцінка ${review.rating} з 5`}>
                                    {renderStars(review.rating)}
                                </div>
                                <h3>{review.authorName}</h3>
                                <ReviewText text={review.text} />
                                <p className="review-meta">{formatReviewDate(review.createdAtUtc)}</p>
                                {isAdmin && (
                                    <button
                                        type="button"
                                        className="review-delete-button"
                                        disabled={deletingReviewId === review.id}
                                        onClick={() => requestDeleteReview(review)}
                                    >
                                        {deletingReviewId === review.id ? "Видалення..." : "Видалити"}
                                    </button>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
