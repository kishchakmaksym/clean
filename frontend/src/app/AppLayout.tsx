import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import "./AppLayout.css";

type AppLayoutProps = {
    children: ReactNode;
};

const navItems = [
    { to: "/", label: "Головна" },
    { to: "/services", label: "Послуги" },
    { to: "/reviews", label: "Відгуки" },
    { to: "/contacts", label: "Контакти" },
];

export default function AppLayout({ children }: AppLayoutProps) {
    const { user } = useAuth();

    return (
        <div className="app-layout">
            <div className="ambient" aria-hidden="true">
                <div className="orb orb-1" />
                <div className="orb orb-2" />
                <div className="orb orb-3" />
                <div className="orb orb-4" />
                <div className="orb orb-5" />
                <div className="orb orb-6" />
            </div>

            <header className="header">
                <div className="header-shell">
                    <div className="header-glass" aria-hidden="true" />
                    <div className="header-inner">
                        <NavLink to="/" className="header-logo" aria-label="Smart Clean — головна">
                            <img src="/logo.png" alt="Smart Clean" className="header-logo-img" />
                        </NavLink>

                        <nav className="header-nav" aria-label="Головна навігація">
                            {navItems.map((item) => (
                                <NavLink key={item.to} to={item.to} className="header-link">
                                    {item.label}
                                </NavLink>
                            ))}
                            {user ? (
                                <NavLink to="/profile" className="header-link">
                                    Профіль
                                </NavLink>
                            ) : (
                                <NavLink to="/login" className="header-link">
                                    Вхід/Реєстрація
                                </NavLink>
                            )}
                        </nav>
                    </div>
                </div>
            </header>

            <main className="main">{children}</main>

            <footer className="footer">
                <div className="footer-inner">
                    <div className="footer-brand">
                        <NavLink to="/" className="footer-logo">
                            CleanPro
                        </NavLink>
                        <p>Професійне прибирання квартир, будинків та офісів.</p>
                    </div>

                    <nav className="footer-nav" aria-label="Навігація в футері">
                        {navItems.map((item) => (
                            <NavLink key={item.to} to={item.to} className="footer-link">
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="footer-contact">
                        <p className="footer-contact-label">Контакти</p>
                        <a href="tel:+380000000000" className="footer-link">
                            +380 XX XXX XX XX
                        </a>
                        <a href="mailto:cleanpro@gmail.com" className="footer-link">
                            cleanpro@gmail.com
                        </a>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© {new Date().getFullYear()} CleanPro. Усі права захищені.</p>
                </div>
            </footer>
        </div>
    );
}
