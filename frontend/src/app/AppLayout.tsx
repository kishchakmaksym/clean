import { type ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import ModalPortal from "../components/ModalPortal";
import SupportFab from "../components/support/SupportFab";
import { supportContacts } from "../config/contacts";
import { useAuth } from "../auth/AuthContext";
import { normalizeUserRole } from "../api/types";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import "./AppLayout.css";

type AppLayoutProps = {
    children: ReactNode;
};

const navItems = [
    { to: "/", label: "Головна" },
    { to: "/services", label: "Послуги" },
    { to: "/reviews", label: "Відгуки" },
    { to: "/faq", label: "FAQ" },
    { to: "/vacancies", label: "Вакансії" },
] as const;

type NavItem = (typeof navItems)[number];

export default function AppLayout({ children }: AppLayoutProps) {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const isAdmin = normalizeUserRole(user?.role) === "Admin";

    useBodyScrollLock(isMobileMenuOpen);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    function closeMobileMenu() {
        setIsMobileMenuOpen(false);
    }

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

    function handleNavItemClick(
        item: NavItem,
        event: React.MouseEvent<HTMLAnchorElement>,
        onAfterNavigate?: () => void,
    ) {
        if (item.to === "/") {
            handleHomeNavClick(event);
        } else if (item.to === "/services") {
            handleServicesNavClick(event);
        }

        onAfterNavigate?.();
    }

    function renderNavLink(item: NavItem, linkClassName: string, onAfterNavigate?: () => void) {
        return (
            <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) => `${linkClassName}${isActive ? " active" : ""}`}
                onClick={(event) => handleNavItemClick(item, event, onAfterNavigate)}
            >
                {item.label}
            </NavLink>
        );
    }

    function renderAccountNavLink(
        to: string,
        label: string,
        className: string,
        onAfterNavigate?: () => void,
    ) {
        return (
            <NavLink
                to={to}
                end
                className={({ isActive }) => `${className}${isActive ? " active" : ""}`}
                onClick={onAfterNavigate}
            >
                {label}
            </NavLink>
        );
    }

    return (
        <div className="app-layout">
            <div className="ambient" aria-hidden="true" />

            <header className={`header${isMobileMenuOpen ? " header--menu-open" : ""}`}>
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

                    <nav className="header-nav header-nav--desktop" aria-label="Головна навігація">
                        {navItems.map((item) => renderNavLink(item, "header-link"))}
                    </nav>

                    <div className="header-actions">
                        {isAdmin ? (
                            <NavLink to="/admin" end className={({ isActive }) => `header-admin${isActive ? " active" : ""}`}>
                                <span className="header-admin-label header-admin-label--full">Адмінка</span>
                                <span className="header-admin-label header-admin-label--short">Адмін</span>
                            </NavLink>
                        ) : null}
                        {user ? (
                            <NavLink to="/profile" end className={({ isActive }) => `header-auth${isActive ? " active" : ""}`}>
                                Профіль
                            </NavLink>
                        ) : (
                            <NavLink
                                to="/login"
                                end
                                className={({ isActive }) => `header-auth header-auth--login${isActive ? " active" : ""}`}
                            >
                                <span className="header-auth-label header-auth-label--full">Вхід/Реєстрація</span>
                                <span className="header-auth-label header-auth-label--short">Вхід</span>
                            </NavLink>
                        )}
                        <button
                            type="button"
                            className={`header-burger${isMobileMenuOpen ? " header-burger--open" : ""}`}
                            aria-expanded={isMobileMenuOpen}
                            aria-controls="header-mobile-menu"
                            aria-label={isMobileMenuOpen ? "Закрити меню" : "Відкрити меню"}
                            onClick={() => setIsMobileMenuOpen((current) => !current)}
                        >
                            <span className="header-burger-line" aria-hidden="true" />
                            <span className="header-burger-line" aria-hidden="true" />
                            <span className="header-burger-line" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </header>

            {isMobileMenuOpen ? (
                <ModalPortal>
                    <div
                        className="header-mobile-backdrop"
                        role="presentation"
                        onMouseDown={closeMobileMenu}
                        onClick={closeMobileMenu}
                    />
                    <nav
                        id="header-mobile-menu"
                        className="header-mobile-menu"
                        aria-label="Мобільна навігація"
                    >
                        <p className="header-mobile-menu-title">Меню</p>
                        <div className="header-mobile-links">
                            {navItems.map((item) =>
                                renderNavLink(item, "header-mobile-link", closeMobileMenu),
                            )}
                        </div>
                        <div className="header-mobile-account">
                            {isAdmin
                                ? renderAccountNavLink(
                                      "/admin",
                                      "Адмінка",
                                      "header-mobile-link header-mobile-link--admin",
                                      closeMobileMenu,
                                  )
                                : null}
                            {user
                                ? renderAccountNavLink("/profile", "Профіль", "header-mobile-link", closeMobileMenu)
                                : renderAccountNavLink(
                                      "/login",
                                      "Вхід / Реєстрація",
                                      "header-mobile-link",
                                      closeMobileMenu,
                                  )}
                        </div>
                    </nav>
                </ModalPortal>
            ) : null}

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
