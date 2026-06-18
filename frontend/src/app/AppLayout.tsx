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
            <div className="ambient" aria-hidden="true" />

            <header className="header">
                <div className="header-bar">
                    <NavLink
                        to="/"
                        className="header-logo"
                        aria-label="Smart Clean — головна"
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
                        {navItems.map((item) => (
                            <NavLink key={item.to} to={item.to} className="header-link">
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="header-actions">
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
