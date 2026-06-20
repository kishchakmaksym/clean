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
import ReviewCardText from "../components/reviews/ReviewCardText";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { ukraineLocalDateTimeToUtcIso, ukraineTodayInputValue } from "../utils/dateTime";
import "./ReviewsPage.css";

type ProfileAdminReviewsTabProps = {
    userId: string;
};

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
    const [readingReview, setReadingReview] = useState<ReviewDto | null>(null);
    const reviewsTopRef = useRef<HTMLDivElement>(null);

    useBodyScrollLock(pendingDeleteReview !== null || readingReview !== null);

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

        if (rating < 1) {
            setErrors(["Оберіть оцінку від 1 до 5 зірок."]);
            setIsSubmitting(false);
            return;
        }

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
                    <div
                        className="review-modal-backdrop"
                        role="presentation"
                        onClick={() => setPendingDeleteReview(null)}
                    >
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
                            aria-labelledby="admin-read-review-title"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="review-read-modal-head">
                                <div>
                                    <h3 id="admin-read-review-title">{readingReview.authorName}</h3>
                                    <p className="review-read-modal-date">
                                        {formatReviewDate(readingReview.createdAtUtc)}
                                    </p>
                                </div>
                                <span
                                    className="admin-review-stars"
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

            <section className="admin-reviews-form-card">
                <h2 className="profile-sidebar-title">Додати відгук</h2>
                <p className="admin-reviews-form-lead">
                    Публікуйте відгук на сайті — вкажіть ім&apos;я клієнта, оцінку та дату.
                </p>

                <form
                    className="profile-form profile-form-edit admin-reviews-form"
                    onSubmit={(event) => void handleSubmit(event)}
                    noValidate
                >
                    {errors.length > 0 ? (
                        <ul className="profile-account-error admin-reviews-alert" role="alert">
                            {errors.map((error) => (
                                <li key={error}>{error}</li>
                            ))}
                        </ul>
                    ) : null}

                    {successMessage ? (
                        <p className="profile-account-success admin-reviews-alert" role="status">
                            {successMessage}
                        </p>
                    ) : null}

                    <div className="admin-reviews-form-row">
                        <label>
                            <span>Ім&apos;я клієнта</span>
                            <input
                                value={authorName}
                                onChange={(event) => setAuthorName(event.target.value)}
                                placeholder="Наприклад, Олена"
                                required
                            />
                        </label>

                        <label>
                            <span>Дата відгуку</span>
                            <input
                                type="date"
                                value={reviewDate}
                                onChange={(event) => setReviewDate(event.target.value)}
                                required
                            />
                        </label>
                    </div>

                    <div className="admin-reviews-stars-field">
                        <span className="admin-reviews-stars-label">Оцінка</span>
                        <div className="admin-reviews-stars" role="radiogroup" aria-label="Оцінка від 1 до 5 зірок">
                            {[1, 2, 3, 4, 5].map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    className={`admin-reviews-star${value <= rating ? " admin-reviews-star--active" : ""}`}
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
                            placeholder="Текст для сайту… (необов'язково)"
                            rows={4}
                        />
                    </label>

                    <button type="submit" className="primary-button admin-reviews-submit" disabled={isSubmitting}>
                        {isSubmitting ? "Додавання…" : "Опублікувати відгук"}
                    </button>
                </form>
            </section>

            <section ref={reviewsTopRef} className="admin-reviews-list-card">
                <div className="admin-reviews-list-head">
                    <h3 className="profile-admin-payment-list-title">Опубліковані відгуки</h3>
                    <span className="admin-reviews-count">{reviews.length}</span>
                </div>

                {isLoading ? <p className="admin-reviews-empty">Завантаження відгуків…</p> : null}
                {loadError ? (
                    <p className="profile-account-error admin-reviews-alert" role="alert">
                        {loadError}
                    </p>
                ) : null}

                {!isLoading && !loadError && reviews.length === 0 ? (
                    <p className="admin-reviews-empty">Поки що немає відгуків.</p>
                ) : null}

                {!isLoading && !loadError && reviews.length > 0 ? (
                    <div className="admin-reviews-list">
                        {reviews.map((review) => (
                            <article key={review.id} className="admin-review-card">
                                <div className="admin-review-card-head">
                                    <div className="admin-review-card-main">
                                        <h4 className="admin-review-author">{review.authorName}</h4>
                                        <p className="admin-review-date">{formatReviewDate(review.createdAtUtc)}</p>
                                    </div>
                                    <div className="admin-review-card-meta">
                                        <span
                                            className="admin-review-stars"
                                            aria-label={`Оцінка ${review.rating} з 5`}
                                        >
                                            {renderStars(review.rating)}
                                        </span>
                                        <button
                                            type="button"
                                            className="profile-admin-invoice-action admin-review-delete"
                                            disabled={deletingReviewId === review.id}
                                            onClick={() => setPendingDeleteReview(review)}
                                        >
                                            {deletingReviewId === review.id ? "Видалення…" : "Видалити"}
                                        </button>
                                    </div>
                                </div>
                                <ReviewCardText
                                    text={review.text}
                                    onReadMore={() => setReadingReview(review)}
                                    blockClassName="admin-review-text-block"
                                    textClassName="admin-review-text"
                                    clampClassName="admin-review-text--clamped"
                                    toggleClassName="admin-review-toggle"
                                />
                            </article>
                        ))}
                    </div>
                ) : null}
            </section>
        </div>
    );
}
