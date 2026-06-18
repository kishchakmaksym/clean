import { useRef, type PointerEvent, type ReactNode } from "react";
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
    const shellRef = useRef<HTMLDivElement>(null);

    const resetShell = () => {
        const shell = shellRef.current;
        if (!shell) return;
        shell.classList.remove("header-shell--hover");
        shell.style.transform = "";
        shell.style.removeProperty("--spot-x");
    };

    const pullBlob = (e: PointerEvent<HTMLElement>) => {
        const shell = shellRef.current;
        if (!shell) return;

        const rect = shell.getBoundingClientRect();
        if (rect.width === 0) return;

        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        const abs = Math.abs(nx);

        shell.classList.add("header-shell--hover");
        shell.style.setProperty("--spot-x", `${50 + nx * 38}%`);
        shell.style.transform = `translateX(${nx * 28}px) scale(${1 + 0.065 + abs * 0.11}, ${1 - 0.025 - abs * 0.045 + ny * 0.03})`;
    };

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

            <header
                className="header"
                onPointerEnter={pullBlob}
                onPointerMove={pullBlob}
                onPointerLeave={resetShell}
            >
                <div className="header-shell" ref={shellRef}>
                    <div className="header-glass" aria-hidden="true" />
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
