import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import AppLayout from "./app/AppLayout";
import ScrollToTop from "./app/ScrollToTop";
import { AuthProvider } from "./auth/AuthContext";
import HomePage from "./pages/HomePage";
import ServicesPage from "./pages/ServicesPage";
import ReviewsPage from "./pages/ReviewsPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import FaqPage from "./pages/FaqPage";

function ProfileOrdersRedirect() {
    const location = useLocation();
    return <Navigate to={`/profile${location.search}`} replace />;
}

function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
            <AuthProvider>
                <AppLayout>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/services" element={<ServicesPage />} />
                        <Route path="/reviews" element={<ReviewsPage />} />
                        <Route path="/faq" element={<FaqPage />} />
                        <Route path="/contacts" element={<Navigate to="/faq" replace />} />
                        <Route path="/login" element={<AuthPage />} />
                        <Route path="/register" element={<Navigate to="/login" replace />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/profile/orders" element={<ProfileOrdersRedirect />} />
                        <Route path="/orders" element={<Navigate to="/profile" replace />} />
                    </Routes>
                </AppLayout>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
