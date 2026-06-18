import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./app/AppLayout";
import { AuthProvider } from "./auth/AuthContext";
import HomePage from "./pages/HomePage";
import ServicesPage from "./pages/ServicesPage";
import ContactsPage from "./pages/ContactsPage";
import ReviewsPage from "./pages/ReviewsPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppLayout>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/services" element={<ServicesPage />} />
                        <Route path="/contacts" element={<ContactsPage />} />
                        <Route path="/reviews" element={<ReviewsPage />} />
                        <Route path="/login" element={<AuthPage />} />
                        <Route path="/register" element={<Navigate to="/login" replace />} />
                        <Route path="/profile" element={<ProfilePage />} />
                    </Routes>
                </AppLayout>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
