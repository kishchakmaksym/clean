import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import { clearAuthUser, getAuthUser, saveAuthUser } from "../api/auth";
import type { UserDto } from "../api/types";

type AuthContextValue = {
    user: UserDto | null;
    setUser: (user: UserDto | null) => void;
    logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUserState] = useState<UserDto | null>(() => getAuthUser());

    const setUser = useCallback((nextUser: UserDto | null) => {
        if (nextUser) {
            saveAuthUser(nextUser);
        } else {
            clearAuthUser();
        }

        setUserState(nextUser);
    }, []);

    const logout = useCallback(() => {
        clearAuthUser();
        setUserState(null);
    }, []);

    const value = useMemo(
        () => ({
            user,
            setUser,
            logout,
        }),
        [user, setUser, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }

    return context;
}
