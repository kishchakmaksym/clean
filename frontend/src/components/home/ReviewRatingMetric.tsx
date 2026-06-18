import CountUpMetric from "./CountUpMetric";
import { HomeIcon } from "./HomeIcons";
import type { ReviewStats } from "../../hooks/useReviewStats";

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

type ReviewRatingMetricProps = {
    stats: ReviewStats;
};

export default function ReviewRatingMetric({ stats }: ReviewRatingMetricProps) {
    if (stats.loading) {
        return <ReviewRatingFallback value="…" />;
    }

    if (stats.averageRating === null) {
        return <ReviewRatingFallback value="—" />;
    }

    return (
        <CountUpMetric value={stats.averageRating} decimals={2} label="рейтинг" icon="star" />
    );
}
