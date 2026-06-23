import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
    createReview,
    fetchReviews,
    formatReviewDate,
    prependReview,
    renderStars,
} from "../api/reviews";
import type { ReviewDto } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ModalPortal from "../components/ModalPortal";
import ReviewCardText from "../components/reviews/ReviewCardText";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import "./HomePage.css";
import "./ReviewsPage.css";

export default function ReviewsPage() {
    const { user } = useAuth();
    const isEmployee = user?.role === "Employee";
    const canLeaveRegularReview = user?.role === "User";

    const [reviews, setReviews] = useState<ReviewDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [rating, setRating] = useState(0);
    const [text, setText] = useState("");
    const [errors, setErrors] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [readingReview, setReadingReview] = useState<ReviewDto | null>(null);
    const firstReviewRef = useRef<HTMLElement | null>(null);
    const reviewsTopRef = useRef<HTMLDivElement>(null);

    useBodyScrollLock(readingReview !== null);

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
        setReviews((current) => prependReview(current, review));
        requestAnimationFrame(() => {
            firstReviewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

        if (rating < 1) {
            setErrors(["Оберіть оцінку від 1 до 5 зірок."]);
            setIsSubmitting(false);
            return;
        }

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

    return (
        <div className="reviews-page reviews-layout">
            {readingReview ? (
                <ModalPortal>
                    <div
                        className="review-modal-backdrop"
                        role="presentation"
                        onClick={() => setReadingReview(null)}
                    >
                        <div
                            className="review-modal review-read-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="review-read-title"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="review-read-modal-head">
                                <div>
                                    <h3 id="review-read-title">{readingReview.authorName}</h3>
                                    <p className="review-read-modal-date">
                                        {formatReviewDate(readingReview.createdAtUtc)}
                                    </p>
                                </div>
                                <span
                                    className="review-stars-display"
                                    aria-label={`Оцінка ${readingReview.rating} з 5`}
                                >
                                    {renderStars(readingReview.rating)}
                                </span>
                            </div>
                            {readingReview.text.trim() ? (
                                <div className="review-read-modal-body">
                                    <p className="review-read-modal-text">{readingReview.text.trim()}</p>
                                </div>
                            ) : null}
                            <div className="review-modal-actions">
                                <button
                                    type="button"
                                    className="primary-button compact"
                                    onClick={() => setReadingReview(null)}
                                >
                                    Закрити
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            ) : null}

            <section className="reviews-form-card">
                <div className="reviews-form-head">
                    <div>
                        <h3 className="reviews-form-title">Залишити відгук</h3>
                        <p className="reviews-form-lead">Поділіться враженням — це допомагає іншим обрати нас.</p>
                    </div>
                </div>

                {isEmployee ? (
                    <p className="review-employee-hint">
                        Ви увійшли як працівник, тому не можете залишати відгук у цьому розділі.
                    </p>
                ) : canLeaveRegularReview ? (
                    <form className="reviews-form" onSubmit={handleRegularSubmit} noValidate>
                        {errors.length > 0 ? (
                            <ul className="review-errors reviews-alert" role="alert">
                                {errors.map((error) => (
                                    <li key={error}>{error}</li>
                                ))}
                            </ul>
                        ) : null}

                        {successMessage ? (
                            <p className="review-success reviews-alert" role="status">
                                {successMessage}
                            </p>
                        ) : null}

                        <label className="reviews-name-field">
                            <span>Ім&apos;я</span>
                            <input value={user!.name} readOnly aria-readonly="true" />
                        </label>

                        <div className="reviews-stars-field">
                            <span className="reviews-stars-label">Оцінка</span>
                            <div className="reviews-stars" role="radiogroup" aria-label="Оцінка від 1 до 5 зірок">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={`reviews-star${value <= rating ? " reviews-star--active" : ""}`}
                                        aria-label={`${value} зірок`}
                                        aria-pressed={value <= rating}
                                        onClick={() => setRating(value)}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="reviews-text-field">
                            <span>Ваш відгук</span>
                            <textarea
                                value={text}
                                onChange={(event) => setText(event.target.value)}
                                placeholder="Розкажіть про свій досвід… (необов'язково)"
                                rows={4}
                            />
                        </label>

                        <button type="submit" className="primary-button reviews-submit" disabled={isSubmitting}>
                            {isSubmitting ? "Публікація…" : "Опублікувати відгук"}
                        </button>
                    </form>
                ) : (
                    <p className="review-guest-hint">
                        Щоб залишити відгук,{" "}
                        <Link to="/login">увійдіть</Link> або{" "}
                        <Link to="/login">зареєструйтесь</Link>.
                    </p>
                )}
            </section>

            <section ref={reviewsTopRef} className="reviews-list-card reviews-list-anchor">
                <h3 className="reviews-list-title">Відгуки клієнтів</h3>

                {isLoading ? <p className="reviews-empty">Завантаження відгуків…</p> : null}
                {loadError ? (
                    <p className="review-load-error reviews-alert" role="alert">
                        {loadError}
                    </p>
                ) : null}

                {!isLoading && !loadError && reviews.length === 0 ? (
                    <p className="reviews-empty">Поки що немає відгуків. Будьте першим!</p>
                ) : null}

                {!isLoading && !loadError && reviews.length > 0 ? (
                    <div className="reviews-list">
                        {reviews.map((review, index) => (
                            <article
                                key={review.id}
                                ref={index === 0 ? firstReviewRef : undefined}
                                className="review-card"
                            >
                                <div className="review-card-head">
                                    <div className="review-card-main">
                                        <h4 className="review-author">{review.authorName}</h4>
                                        <p className="review-meta">{formatReviewDate(review.createdAtUtc)}</p>
                                    </div>
                                    <span
                                        className="review-stars-display"
                                        aria-label={`Оцінка ${review.rating} з 5`}
                                    >
                                        {renderStars(review.rating)}
                                    </span>
                                </div>
                                <ReviewCardText
                                    text={review.text}
                                    onReadMore={() => setReadingReview(review)}
                                />
                            </article>
                        ))}
                    </div>
                ) : null}
            </section>
        </div>
    );
}
