import CountUpMetric from "./CountUpMetric";
import { HomeIcon } from "./HomeIcons";
import type { ReviewStats } from "../../hooks/useReviewStats";

function ReviewCountFallback({ value }: { value: string }) {
    return (
        <div className="metric metric--card" aria-label={`Відгуків: ${value}`}>
            <div className="metric-icon" aria-hidden="true">
                <HomeIcon name="chat" />
            </div>
            <div className="metric-value">{value}</div>
            <div className="metric-label">відгуків</div>
        </div>
    );
}

type ReviewCountMetricProps = {
    stats: ReviewStats;
};

export default function ReviewCountMetric({ stats }: ReviewCountMetricProps) {
    if (stats.loading) {
        return <ReviewCountFallback value="…" />;
    }

    return <CountUpMetric value={stats.reviewCount} label="відгуків" icon="chat" />;
}
