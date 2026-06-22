import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";

import RouteSeo from "./components/seo/RouteSeo";
import AppLayout from "./app/AppLayout";
import ScrollToTop from "./app/ScrollToTop";
import { AuthProvider } from "./auth/AuthContext";
import HomePage from "./pages/HomePage";

const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const FaqPage = lazy(() => import("./pages/FaqPage"));
const VacanciesPage = lazy(() => import("./pages/VacanciesPage"));

function ProfileOrdersRedirect() {
    const location = useLocation();
    return <Navigate to={`/profile${location.search}`} replace />;
}

function RouteFallback() {
    return <div className="route-fallback" aria-hidden="true" />;
}

function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
            <RouteSeo />
            <AuthProvider>
                <AppLayout>
                    <Suspense fallback={<RouteFallback />}>
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/services" element={<ServicesPage />} />
                            <Route path="/reviews" element={<ReviewsPage />} />
                            <Route path="/faq" element={<FaqPage />} />
                            <Route path="/vacancies" element={<VacanciesPage />} />
                            <Route path="/contacts" element={<Navigate to="/faq" replace />} />
                            <Route path="/login" element={<AuthPage />} />
                            <Route path="/register" element={<Navigate to="/login" replace />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/admin" element={<AdminPage />} />
                            <Route path="/profile/orders" element={<ProfileOrdersRedirect />} />
                            <Route path="/orders" element={<Navigate to="/profile" replace />} />
                        </Routes>
                    </Suspense>
                </AppLayout>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
