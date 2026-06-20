import type { CreateReviewResponse, DeleteReviewResponse, ReviewDto } from "./types";
import { formatUkrainianDate, parseUtcDate } from "../utils/dateTime";

export function sortReviewsByNewest(reviews: ReviewDto[]) {
    return [...reviews].sort((left, right) => {
        const dateDiff =
            parseUtcDate(right.createdAtUtc).getTime() - parseUtcDate(left.createdAtUtc).getTime();

        if (dateDiff !== 0) {
            return dateDiff;
        }

        return right.id.localeCompare(left.id);
    });
}

export function prependReview(reviews: ReviewDto[], review: ReviewDto): ReviewDto[] {
    const normalized: ReviewDto = {
        ...review,
        id: String(review.id),
        createdAtUtc:
            typeof review.createdAtUtc === "string"
                ? review.createdAtUtc
                : new Date(review.createdAtUtc as unknown as string).toISOString(),
    };

    const withoutDuplicate = reviews.filter((item) => item.id !== normalized.id);
    return [normalized, ...withoutDuplicate];
}

export function mergeReviewAtTop(reviews: ReviewDto[], review: ReviewDto) {
    return sortReviewsByNewest(prependReview(reviews, review));
}

export function getAverageReviewRating(reviews: ReviewDto[]): number | null {
    if (reviews.length === 0) {
        return null;
    }

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((total / reviews.length) * 100) / 100;
}

export async function fetchReviews(): Promise<ReviewDto[]> {
    const response = await fetch("/api/reviews");

    if (!response.ok) {
        throw new Error("Не вдалося завантажити відгуки.");
    }

    const reviews = (await response.json()) as ReviewDto[];
    return sortReviewsByNewest(reviews);
}

export async function createReview(payload: {
    userId: string;
    rating: number;
    text: string;
}): Promise<CreateReviewResponse> {
    const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = (await response.json()) as CreateReviewResponse;

    if (!response.ok && data.success !== false) {
        return {
            success: false,
            errors: ["Не вдалося опублікувати відгук."],
        };
    }

    return data;
}

export async function createAdminReview(payload: {
    userId: string;
    authorName: string;
    rating: number;
    text: string;
    createdAtUtc: string;
}): Promise<CreateReviewResponse> {
    const response = await fetch("/api/reviews/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = (await response.json()) as CreateReviewResponse;

    if (!response.ok && data.success !== false) {
        return {
            success: false,
            errors: ["Не вдалося додати відгук."],
        };
    }

    return data;
}

export async function deleteAdminReview(payload: {
    userId: string;
    reviewId: string;
}): Promise<DeleteReviewResponse> {
    const response = await fetch("/api/reviews/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = (await response.json()) as DeleteReviewResponse;

    if (!response.ok && data.success !== false) {
        return {
            success: false,
            errors: ["Не вдалося видалити відгук."],
        };
    }

    return data;
}

export function formatReviewDate(isoDate: string) {
    return formatUkrainianDate(isoDate);
}

export function renderStars(rating: number) {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
}
