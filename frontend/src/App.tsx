import { BrowserRouter, Route, Routes } from "react-router-dom";

import AppLayout from "./app/AppLayout";
import HomePage from "./pages/HomePage";
import ServicesPage from "./pages/ServicesPage";
import ContactsPage from "./pages/ContactsPage";
import ReviewsPage from "./pages/ReviewsPage";

function App() {
    return (
        <BrowserRouter>
            <AppLayout>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/services" element={<ServicesPage />} />
                    <Route path="/contacts" element={<ContactsPage />} />
                    <Route path="/reviews" element={<ReviewsPage />} />
                </Routes>
            </AppLayout>
        </BrowserRouter>
    );
}

export default App;