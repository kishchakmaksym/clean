export type UserRole = "User" | "Employee" | "Admin";

export type UserDto = {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
};

export type AuthResponse = {
    success: boolean;
    message?: string;
    user?: UserDto;
    errors?: string[];
};

export type RegisterRequest = {
    name: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
};

export type LoginRequest = {
    login: string;
    password: string;
};

export type ReviewDto = {
    id: string;
    authorName: string;
    rating: number;
    text: string;
    createdAtUtc: string;
};

export type CreateReviewResponse = {
    success: boolean;
    message?: string;
    review?: ReviewDto;
    errors?: string[];
};

export type DeleteReviewResponse = {
    success: boolean;
    message?: string;
    errors?: string[];
};
