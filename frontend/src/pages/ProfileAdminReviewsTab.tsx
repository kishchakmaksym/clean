import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import {
    createAdminReview,
    deleteAdminReview,
    fetchReviews,
    formatReviewDate,
    mergeReviewAtTop,
    renderStars,
} from "../api/reviews";
import type { ReviewDto } from "../api/types";
import ModalPortal from "../components/ModalPortal";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { ukraineLocalDateTimeToUtcIso, ukraineTodayInputValue } from "../utils/dateTime";
import "./ReviewsPage.css";

type ProfileAdminReviewsTabProps = {
    userId: string;
};

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

export default function ProfileAdminReviewsTab({ userId }: ProfileAdminReviewsTabProps) {
    const [reviews, setReviews] = useState<ReviewDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [rating, setRating] = useState(0);
    const [text, setText] = useState("");
    const [authorName, setAuthorName] = useState("");
    const [reviewDate, setReviewDate] = useState(ukraineTodayInputValue());
    const [errors, setErrors] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
    const [pendingDeleteReview, setPendingDeleteReview] = useState<ReviewDto | null>(null);
    const reviewsTopRef = useRef<HTMLDivElement>(null);

    useBodyScrollLock(pendingDeleteReview !== null);

    const loadReviews = useCallback(async (options?: { silent?: boolean }) => {
        if (!options?.silent) {
            setIsLoading(true);
        }
        setLoadError("");

        try {
            const data = await fetchReviews();
            setReviews(data);
        } catch {
            setLoadError("Не вдалося завантажити відгуки.");
        } finally {
            if (!options?.silent) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void loadReviews();
    }, [loadReviews]);

    const showNewReviewAtTop = useCallback((review: ReviewDto) => {
        setReviews((current) => mergeReviewAtTop(current, review));
        requestAnimationFrame(() => {
            reviewsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrors([]);
        setSuccessMessage("");
        setIsSubmitting(true);

        try {
            const result = await createAdminReview({
                userId,
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
            setReviewDate(ukraineTodayInputValue());

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
        setErrors([]);
        setSuccessMessage("");
        setDeletingReviewId(reviewId);

        try {
            const result = await deleteAdminReview({ userId, reviewId });

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

    return (
        <div className="admin-reviews-panel">
            {pendingDeleteReview ? (
                <ModalPortal>
                    <div className="review-modal-backdrop" role="presentation" onClick={() => setPendingDeleteReview(null)}>
                    <div
                        className="review-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-delete-review-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3 id="admin-delete-review-title">Видалити відгук?</h3>
                        <p>
                            Ви впевнені, що хочете видалити відгук від{" "}
                            <strong>{pendingDeleteReview.authorName}</strong>?
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
                                className="primary-button compact"
                                disabled={deletingReviewId === pendingDeleteReview.id}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    void handleDeleteReview(pendingDeleteReview.id);
                                }}
                            >
                                {deletingReviewId === pendingDeleteReview.id ? "Видалення…" : "Так, видалити"}
                            </button>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            ) : null}

            <div className="review-form-card admin-reviews-form">
                <h3>Додати відгук</h3>

                <form className="review-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
                    {errors.length > 0 ? (
                        <ul className="review-errors" role="alert">
                            {errors.map((error) => (
                                <li key={error}>{error}</li>
                            ))}
                        </ul>
                    ) : null}

                    {successMessage ? (
                        <p className="review-success" role="status">
                            {successMessage}
                        </p>
                    ) : null}

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
                            placeholder="Текст відгуку для сайту…"
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
                        {isSubmitting ? "Додавання…" : "Додати відгук"}
                    </button>
                </form>
            </div>

            <div ref={reviewsTopRef} className="admin-reviews-list">
                {isLoading ? <p className="reviews-empty">Завантаження відгуків…</p> : null}
                {loadError ? <p className="review-load-error">{loadError}</p> : null}

                {!isLoading && !loadError && reviews.length === 0 ? (
                    <p className="reviews-empty">Поки що немає відгуків.</p>
                ) : null}

                {!isLoading && !loadError && reviews.length > 0 ? (
                    <div className="reviews-grid">
                        {reviews.map((review) => (
                            <article key={review.id} className="glass-card info-card review-card">
                                <div className="review-stars-display" aria-label={`Оцінка ${review.rating} з 5`}>
                                    {renderStars(review.rating)}
                                </div>
                                <h3>{review.authorName}</h3>
                                <ReviewText text={review.text} />
                                <p className="review-meta">{formatReviewDate(review.createdAtUtc)}</p>
                                <button
                                    type="button"
                                    className="review-delete-button"
                                    disabled={deletingReviewId === review.id}
                                    onClick={() => setPendingDeleteReview(review)}
                                >
                                    {deletingReviewId === review.id ? "Видалення…" : "Видалити"}
                                </button>
                            </article>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
