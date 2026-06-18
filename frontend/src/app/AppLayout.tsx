import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
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
    const [headerHover, setHeaderHover] = useState(false);

    return (
        <div className="app-layout">
            <svg className="header-filters" aria-hidden="true">
                <defs>
                    <filter id="header-liquid" x="-25%" y="-35%" width="150%" height="170%">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.014"
                            numOctaves="2"
                            seed="4"
                            result="noise"
                        >
                            <animate
                                attributeName="baseFrequency"
                                dur="2.4s"
                                values="0.01;0.02;0.012;0.018;0.01"
                                repeatCount="indefinite"
                            />
                        </feTurbulence>
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="noise"
                            scale="7"
                            xChannelSelector="R"
                            yChannelSelector="G"
                        >
                            <animate
                                attributeName="scale"
                                dur="1.8s"
                                values="5;11;6;9;5"
                                repeatCount="indefinite"
                            />
                        </feDisplacementMap>
                    </filter>
                </defs>
            </svg>

            <div className="ambient" aria-hidden="true">
                <div className="orb orb-1" />
                <div className="orb orb-2" />
                <div className="orb orb-3" />
                <div className="orb orb-4" />
                <div className="orb orb-5" />
                <div className="orb orb-6" />
            </div>

            <header
                className={`header${headerHover ? " header--hover" : ""}`}
                onMouseEnter={() => setHeaderHover(true)}
                onMouseLeave={() => setHeaderHover(false)}
            >
                <div className="header-shell">
                    <div className="header-glass" aria-hidden="true" />
                    <div className="header-inner">
                        <NavLink to="/" className="header-logo header-liquid-text">
                            CleanPro
                        </NavLink>

                        <nav className="header-nav" aria-label="Головна навігація">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className="header-link header-liquid-text"
                                >
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>

                        <NavLink to="/contacts" className="header-cta header-liquid-text">
                            Замовити
                        </NavLink>
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
