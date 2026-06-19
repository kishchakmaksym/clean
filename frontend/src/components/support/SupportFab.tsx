import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";

import FaqAccordion from "../faq/FaqAccordion";
import { supportContacts } from "../../config/contacts";
import "./SupportFab.css";

function HelpIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="support-fab-icon">
            <path
                d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="support-fab-icon">
            <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

export default function SupportFab() {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelId = useId();

    useEffect(() => {
        if (!open) {
            return;
        }

        function handlePointerDown(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    return (
        <div className="support-fab" ref={rootRef}>
            {open ? (
                <div className="support-fab-panel" id={panelId} role="dialog" aria-label="Часті питання">
                    <header className="support-fab-header">
                        <div>
                            <p className="support-fab-header-title">Часті питання</p>
                            <p className="support-fab-header-sub">Швидкі відповіді</p>
                        </div>
                        <button
                            type="button"
                            className="support-fab-header-close"
                            aria-label="Закрити"
                            onClick={() => setOpen(false)}
                        >
                            <CloseIcon />
                        </button>
                    </header>

                    <div className="support-fab-body">
                        <FaqAccordion compact />
                    </div>

                    <footer className="support-fab-footer">
                        <Link to="/faq" className="support-fab-full-link" onClick={() => setOpen(false)}>
                            Всі питання →
                        </Link>
                        <div className="support-fab-footer-links">
                            <a href={supportContacts.phoneHref}>Зателефонувати</a>
                            <a href={supportContacts.emailHref}>Email</a>
                        </div>
                    </footer>
                </div>
            ) : null}

            <button
                type="button"
                className={`support-fab-trigger${open ? " support-fab-trigger--open" : ""}`}
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={open ? "Закрити FAQ" : "Відкрити FAQ"}
                onClick={() => setOpen((current) => !current)}
            >
                {open ? <CloseIcon /> : <HelpIcon />}
            </button>
        </div>
    );
}
