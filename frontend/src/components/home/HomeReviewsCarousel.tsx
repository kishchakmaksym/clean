import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { fetchReviews, formatReviewDate, renderStars } from "../../api/reviews";
import type { ReviewDto } from "../../api/types";
import "./HomeReviewsCarousel.css";

const MAX_HOME_REVIEWS = 5;
const AUTO_ADVANCE_MS = 2000;

function CarouselChevron({ direction }: { direction: "prev" | "next" }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="home-reviews-arrow-icon">
            <path
                d={direction === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function getSlideOffset(slideIndex: number, activeIndex: number, total: number) {
    if (total <= 1) {
        return 0;
    }

    let diff = slideIndex - activeIndex;
    if (diff > total / 2) {
        diff -= total;
    }
    if (diff < -total / 2) {
        diff += total;
    }

    return diff;
}

function HomeReviewCard({ review, offset }: { review: ReviewDto; offset: number }) {
    const trimmed = review.text.trim();
    const position =
        offset === 0 ? "active" : offset < 0 ? "prev" : offset > 0 ? "next" : "hidden";

    return (
        <article
            className={`home-review-card home-review-card--${position}`}
            aria-hidden={offset !== 0}
        >
            <div className="home-review-card-head">
                <div>
                    <h3 className="home-review-author">{review.authorName}</h3>
                    <p className="home-review-date">{formatReviewDate(review.createdAtUtc)}</p>
                </div>
                <span className="home-review-stars" aria-label={`Оцінка ${review.rating} з 5`}>
                    {renderStars(review.rating)}
                </span>
            </div>
            <div className="home-review-card-body">
                <p className="home-review-text">{trimmed}</p>
            </div>
        </article>
    );
}

export default function HomeReviewsCarousel() {
    const [reviews, setReviews] = useState<ReviewDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        let cancelled = false;

        fetchReviews()
            .then((data) => {
                if (!cancelled) {
                    setReviews(data.slice(0, MAX_HOME_REVIEWS));
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setReviews([]);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const total = reviews.length;

    const goToNext = useCallback(() => {
        if (total <= 1) {
            return;
        }

        setActiveIndex((current) => (current + 1) % total);
    }, [total]);

    const goToPrev = useCallback(() => {
        if (total <= 1) {
            return;
        }

        setActiveIndex((current) => (current - 1 + total) % total);
    }, [total]);

    useEffect(() => {
        if (total <= 1) {
            return;
        }

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (reducedMotion.matches) {
            return;
        }

        const intervalId = window.setInterval(() => {
            goToNext();
        }, AUTO_ADVANCE_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [goToNext, total]);

    if (isLoading) {
        return (
            <section className="home-reviews" aria-label="Відгуки клієнтів">
                <div className="hero-panel home-reviews-panel">
                    <div className="home-reviews-head">
                        <h2 className="home-reviews-title">Що кажуть клієнти</h2>
                    </div>
                    <p className="home-reviews-empty">Завантаження відгуків…</p>
                </div>
            </section>
        );
    }

    if (total === 0) {
        return null;
    }

    return (
        <section className="home-reviews" aria-label="Відгуки клієнтів">
            <div className="hero-panel home-reviews-panel">
                <div className="home-reviews-head">
                    <h2 className="home-reviews-title">Що кажуть клієнти</h2>
                    <p className="home-reviews-lead">
                        Останні відгуки — оберіть стрілками або зачекайте, вони змінюються автоматично.
                    </p>
                </div>

                <div className="home-reviews-carousel">
                    <div className="home-reviews-collage" aria-live="polite">
                        {reviews.map((review, slideIndex) => {
                            const offset = getSlideOffset(slideIndex, activeIndex, total);
                            if (Math.abs(offset) > 1) {
                                return null;
                            }

                            return (
                                <HomeReviewCard
                                    key={review.id}
                                    review={review}
                                    offset={offset}
                                />
                            );
                        })}
                    </div>

                    {total > 1 ? (
                        <div className="home-reviews-nav">
                            <button
                                type="button"
                                className="home-reviews-arrow home-reviews-arrow--prev"
                                onClick={goToPrev}
                                aria-label="Попередній відгук"
                            >
                                <CarouselChevron direction="prev" />
                            </button>
                            <button
                                type="button"
                                className="home-reviews-arrow home-reviews-arrow--next"
                                onClick={goToNext}
                                aria-label="Наступний відгук"
                            >
                                <CarouselChevron direction="next" />
                            </button>
                        </div>
                    ) : null}
                </div>

                {total > 1 ? (
                    <div className="home-reviews-dots" role="tablist" aria-label="Відгуки">
                        {reviews.map((review, index) => (
                            <button
                                key={review.id}
                                type="button"
                                role="tab"
                                aria-selected={index === activeIndex}
                                aria-label={`Відгук ${index + 1} від ${review.authorName}`}
                                className={`home-reviews-dot${index === activeIndex ? " home-reviews-dot--active" : ""}`}
                                onClick={() => setActiveIndex(index)}
                            />
                        ))}
                    </div>
                ) : null}

                <div className="home-reviews-footer">
                    <Link to="/reviews" className="secondary-button compact">
                        Всі відгуки
                    </Link>
                </div>
            </div>
        </section>
    );
}
