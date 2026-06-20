import { type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import SupportFab from "../components/support/SupportFab";
import { supportContacts } from "../config/contacts";
import { useAuth } from "../auth/AuthContext";
import "./AppLayout.css";

type AppLayoutProps = {
    children: ReactNode;
};

const navItems = [
    { to: "/", label: "Головна" },
    { to: "/services", label: "Послуги" },
    { to: "/reviews", label: "Відгуки" },
    { to: "/faq", label: "FAQ" },
];

export default function AppLayout({ children }: AppLayoutProps) {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    function handleHomeNavClick(event: React.MouseEvent<HTMLAnchorElement>) {
        if (location.pathname !== "/") {
            return;
        }

        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function handleServicesNavClick(event: React.MouseEvent<HTMLAnchorElement>) {
        if (location.pathname !== "/services") {
            return;
        }

        event.preventDefault();
        navigate("/services", { replace: true, state: { scrollServicesTop: true } });
    }

    return (
        <div className="app-layout">
            <div className="ambient" aria-hidden="true" />

            <header className="header">
                <div className="header-bar">
                    <NavLink
                        to="/"
                        className="header-logo"
                        aria-label="Smart Clean — головна"
                        onClick={handleHomeNavClick}
                        onContextMenu={(event) => event.preventDefault()}
                        onDragStart={(event) => event.preventDefault()}
                    >
                        <img
                            src="/logo.gif"
                            alt=""
                            className="header-logo-img"
                            draggable={false}
                            onContextMenu={(event) => event.preventDefault()}
                        />
                    </NavLink>

                    <nav className="header-nav" aria-label="Головна навігація">
                        {navItems.map((item) =>
                            item.to === "/services" ? (
                                <NavLink
                                    key={item.to}
                                    to="/services"
                                    className="header-link"
                                    onClick={handleServicesNavClick}
                                >
                                    {item.label}
                                </NavLink>
                            ) : item.to === "/" ? (
                                <NavLink
                                    key={item.to}
                                    to="/"
                                    className="header-link"
                                    onClick={handleHomeNavClick}
                                >
                                    {item.label}
                                </NavLink>
                            ) : (
                                <NavLink key={item.to} to={item.to} className="header-link">
                                    {item.label}
                                </NavLink>
                            ),
                        )}
                    </nav>

                    <div className="header-actions">
                        {user?.role === "Employee" ? (
                            <NavLink to="/profile" className="header-cleaner">
                                Кабінет прибиральниці
                            </NavLink>
                        ) : (
                            <NavLink to="/login?for=employee" className="header-cleaner">
                                Для прибиральниць
                            </NavLink>
                        )}
                        {user ? (
                            <NavLink to="/profile" className="header-auth">
                                Профіль
                            </NavLink>
                        ) : (
                            <NavLink to="/login" className="header-auth">
                                Вхід/Реєстрація
                            </NavLink>
                        )}
                    </div>
                </div>
            </header>

            <main className="main">{children}</main>

            <footer className="footer">
                <div className="footer-inner">
                    <div className="footer-brand">
                        <NavLink
                            to="/"
                            className="footer-logo"
                            aria-label="Smart Clean — головна"
                            onClick={handleHomeNavClick}
                            onContextMenu={(event) => event.preventDefault()}
                            onDragStart={(event) => event.preventDefault()}
                        >
                            <img
                                src="/logo.gif"
                                alt=""
                                className="footer-logo-img"
                                draggable={false}
                                onContextMenu={(event) => event.preventDefault()}
                            />
                        </NavLink>
                        <p>Професійне прибирання квартир, будинків та офісів.</p>
                    </div>

                    <nav className="footer-nav" aria-label="Навігація в футері">
                        {navItems.map((item) =>
                            item.to === "/services" ? (
                                <NavLink
                                    key={item.to}
                                    to="/services"
                                    className="footer-link"
                                    onClick={handleServicesNavClick}
                                >
                                    {item.label}
                                </NavLink>
                            ) : item.to === "/" ? (
                                <NavLink
                                    key={item.to}
                                    to="/"
                                    className="footer-link"
                                    onClick={handleHomeNavClick}
                                >
                                    {item.label}
                                </NavLink>
                            ) : (
                                <NavLink key={item.to} to={item.to} className="footer-link">
                                    {item.label}
                                </NavLink>
                            ),
                        )}
                    </nav>

                    <div className="footer-contact">
                        <p className="footer-contact-label">Контакти</p>
                        <a href={supportContacts.phoneHref} className="footer-link">
                            {supportContacts.phoneDisplay}
                        </a>
                        <a href={supportContacts.emailHref} className="footer-link">
                            {supportContacts.email}
                        </a>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© {new Date().getFullYear()} CleanPro. Усі права захищені.</p>
                </div>
            </footer>

            <SupportFab />
        </div>
    );
}
