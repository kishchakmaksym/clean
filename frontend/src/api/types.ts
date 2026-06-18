export type UserDto = {
    id: string;
    name: string;
    email: string;
    phone: string;
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
