import { Navigate, useLocation } from "react-router-dom";

import type { UserProfileDto } from "../api/profile";
import { normalizeUserRole } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ProfileAccountTab from "./ProfileAccountTab";
import ProfileAdminPaymentPanel from "./ProfileAdminPaymentPanel";
import ProfileOrdersTab from "./ProfileOrdersTab";
import "./HomePage.css";
import "./ProfilePage.css";

export default function ProfilePage() {
    const { user, setUser, logout } = useAuth();
    const location = useLocation();

    function handleProfileSaved(profile: UserProfileDto) {
        if (!user) {
            return;
        }

        setUser({
            ...user,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
        });
    }

    if (!user) {
        const returnTo = encodeURIComponent(location.pathname);
        return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
    }

    const userRole = normalizeUserRole(user.role);
    const isStaff = userRole === "Admin" || userRole === "Employee";

    return (
        <div className="profile-page">
            <div className="profile-layout">
                <aside className="profile-sidebar">
                    <ProfileAccountTab user={user} onProfileSaved={handleProfileSaved} onLogout={logout} />
                    {userRole === "Admin" ? <ProfileAdminPaymentPanel userId={user.id} /> : null}
                </aside>

                <section className="profile-orders-section" aria-labelledby="profile-orders-heading">
                    <div className="profile-orders-head">
                        <h2 id="profile-orders-heading">Замовлення</h2>
                        <p>
                            {userRole === "Admin"
                                ? "Підтверджуйте нові заявки та позначайте виконані"
                                : isStaff
                                  ? "Усі заявки та їхній статус"
                                  : "Усі ваші заявки та їхній статус"}
                        </p>
                    </div>
                    <ProfileOrdersTab />
                </section>
            </div>
        </div>
    );
}
