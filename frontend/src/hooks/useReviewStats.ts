import { useEffect, useState } from "react";

import { fetchReviews, getAverageReviewRating } from "../api/reviews";

export type ReviewStats = {
    loading: boolean;
    averageRating: number | null;
    reviewCount: number;
};

export function useReviewStats(): ReviewStats {
    const [stats, setStats] = useState<ReviewStats>({
        loading: true,
        averageRating: null,
        reviewCount: 0,
    });

    useEffect(() => {
        let cancelled = false;

        fetchReviews()
            .then((reviews) => {
                if (!cancelled) {
                    setStats({
                        loading: false,
                        averageRating: getAverageReviewRating(reviews),
                        reviewCount: reviews.length,
                    });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setStats({
                        loading: false,
                        averageRating: null,
                        reviewCount: 0,
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return stats;
}
