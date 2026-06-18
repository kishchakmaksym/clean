import { Navigate } from "react-router-dom";

import type { UserRole } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import "./AuthPage.css";
import "./HomePage.css";

export default function ProfilePage() {
    const { user, logout } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const roleLabels: Record<UserRole, string> = {
        User: "Користувач",
        Employee: "Працівник",
        Admin: "Адміністратор",
    };

    return (
        <section className="section auth-page">
            <div className="section-head">
                <h2>Профіль</h2>
                <p>Ваші дані облікового запису.</p>
            </div>

            <div className="auth-card profile-card">
                <div className="profile-fields">
                    <div className="profile-field">
                        <span className="profile-label">Роль</span>
                        <span className="profile-value">{roleLabels[user.role]}</span>
                    </div>
                    <div className="profile-field">
                        <span className="profile-label">Ім&apos;я</span>
                        <span className="profile-value">{user.name}</span>
                    </div>
                    <div className="profile-field">
                        <span className="profile-label">Електронна пошта</span>
                        <span className="profile-value">{user.email}</span>
                    </div>
                    <div className="profile-field">
                        <span className="profile-label">Телефон</span>
                        <span className="profile-value">{user.phone}</span>
                    </div>
                </div>

                <button type="button" className="primary-button profile-logout" onClick={logout}>
                    Вийти
                </button>
            </div>
        </section>
    );
}
