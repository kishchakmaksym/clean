import { useEffect, useState } from "react";

import { fetchReviews, getAverageReviewRating } from "../../api/reviews";
import CountUpMetric from "./CountUpMetric";
import { HomeIcon } from "./HomeIcons";

function ReviewRatingFallback({ value }: { value: string }) {
    return (
        <div className="metric metric--card" aria-label={`Рейтинг: ${value}`}>
            <div className="metric-icon" aria-hidden="true">
                <HomeIcon name="star" />
            </div>
            <div className="metric-value">{value}</div>
            <div className="metric-label">рейтинг</div>
        </div>
    );
}

export default function ReviewRatingMetric() {
    const [averageRating, setAverageRating] = useState<number | null | undefined>(undefined);

    useEffect(() => {
        let cancelled = false;

        fetchReviews()
            .then((reviews) => {
                if (!cancelled) {
                    setAverageRating(getAverageReviewRating(reviews));
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setAverageRating(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    if (averageRating === undefined) {
        return <ReviewRatingFallback value="…" />;
    }

    if (averageRating === null) {
        return <ReviewRatingFallback value="—" />;
    }

    return (
        <CountUpMetric value={averageRating} decimals={2} label="рейтинг" icon="star" />
    );
}
