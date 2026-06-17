import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import "./AppLayout.css";

type AppLayoutProps = {
    children: ReactNode;
};

const navItems = [
    { to: "/", label: "Головна" },
    { to: "/services", label: "Послуги" },
    { to: "/prices", label: "Ціни" },
    { to: "/reviews", label: "Відгуки" },
    { to: "/contacts", label: "Контакти" },
];

export default function AppLayout({ children }: AppLayoutProps) {
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
                <div className="header-inner">
                    <NavLink to="/" className="header-logo">
                        CleanPro
                    </NavLink>

                    <nav className="header-nav" aria-label="Головна навігація">
                        {navItems.map((item) => (
                            <NavLink key={item.to} to={item.to} className="header-link">
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <NavLink to="/contacts" className="header-cta">
                        Замовити
                    </NavLink>
                </div>
            </header>

            <main className="main">{children}</main>

            <footer className="footer">
                <div className="footer-inner">
                    <div>
                        <strong>CleanPro</strong>
                        <p>Професійне прибирання квартир, будинків та офісів.</p>
                    </div>
                    <div>
                        <p>Телефон: +380 XX XXX XX XX</p>
                        <p>Email: cleanpro@gmail.com</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
