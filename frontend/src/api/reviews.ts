import type { CreateReviewResponse, DeleteReviewResponse, ReviewDto } from "./types";

export async function fetchReviews(): Promise<ReviewDto[]> {
    const response = await fetch("/api/reviews");

    if (!response.ok) {
        throw new Error("Не вдалося завантажити відгуки.");
    }

    return (await response.json()) as ReviewDto[];
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
    return new Intl.DateTimeFormat("uk-UA", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(isoDate));
}

export function renderStars(rating: number) {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
}
