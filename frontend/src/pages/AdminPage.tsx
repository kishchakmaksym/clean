import { Navigate, useSearchParams } from "react-router-dom";

import { normalizeUserRole } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ProfileAdminPaymentPanel from "./ProfileAdminPaymentPanel";
import ProfileAdminReviewsTab from "./ProfileAdminReviewsTab";
import ProfileAdminSupportTab from "./ProfileAdminSupportTab";
import ProfileOrdersTab from "./ProfileOrdersTab";
import "./HomePage.css";
import "./ProfilePage.css";
import "./ServicesPage.css";
import "./AdminPage.css";

const ADMIN_TABS = [
    {
        id: "orders",
        modifier: "admin-orders",
        label: "Замовлення",
        shortLabel: "Замовлення",
    },
    {
        id: "invoices",
        modifier: "admin-invoices",
        label: "Рахунки на оплату",
        shortLabel: "Рахунки",
    },
    {
        id: "reviews",
        modifier: "admin-reviews",
        label: "Відгуки",
        shortLabel: "Відгуки",
    },
    {
        id: "support",
        modifier: "admin-support",
        label: "Підтримка",
        shortLabel: "Підтримка",
    },
] as const;

type AdminTabId = (typeof ADMIN_TABS)[number]["id"];

function parseAdminTab(value: string | null): AdminTabId {
    if (value === "invoices" || value === "reviews" || value === "support") {
        return value;
    }

    return "orders";
}

export default function AdminPage() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    if (!user) {
        return <Navigate to="/login?returnTo=%2Fadmin" replace />;
    }

    if (normalizeUserRole(user.role) !== "Admin") {
        return <Navigate to="/profile" replace />;
    }

    const activeTab = parseAdminTab(searchParams.get("tab"));
    const activeTabConfig = ADMIN_TABS.find((tab) => tab.id === activeTab) ?? ADMIN_TABS[0];

    function switchTab(tabId: AdminTabId) {
        setSearchParams(tabId === "orders" ? {} : { tab: tabId }, { replace: true });
    }

    return (
        <div className="admin-page">
            <div className="services-tabs-wrap admin-tabs-wrap">
                <div
                    className={`services-tabs services-tabs--${activeTabConfig.modifier}`}
                    role="tablist"
                    aria-label="Розділи адмін-панелі"
                >
                    <span className="services-tabs-indicator" aria-hidden="true" />
                    {ADMIN_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            className={`services-tab${activeTab === tab.id ? " services-tab--active" : ""}`}
                            onClick={() => switchTab(tab.id)}
                        >
                            <span className="services-tab-label services-tab-label--full">{tab.label}</span>
                            <span className="services-tab-label services-tab-label--short">{tab.shortLabel}</span>
                        </button>
                    ))}
                </div>
            </div>

            <section className="admin-panel-section" role="tabpanel" aria-label={activeTabConfig.label}>
                {activeTab === "orders" ? <ProfileOrdersTab viewMode="admin-panel" /> : null}
                {activeTab === "invoices" ? (
                    <ProfileAdminPaymentPanel userId={user.id} variant="admin-panel" />
                ) : null}
                {activeTab === "reviews" ? <ProfileAdminReviewsTab userId={user.id} /> : null}
                {activeTab === "support" ? <ProfileAdminSupportTab userId={user.id} /> : null}
            </section>
        </div>
    );
}
