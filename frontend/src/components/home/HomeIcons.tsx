const iconProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
};

export type HomeIconName =
    | "rocket"
    | "leaf"
    | "price"
    | "shield"
    | "refresh"
    | "checklist"
    | "chat"
    | "request"
    | "van"
    | "sparkle"
    | "handshake"
    | "star"
    | "clock";

export function HomeIcon({ name, className }: { name: HomeIconName; className?: string }) {
    switch (name) {
        case "rocket":
            return (
                <svg {...iconProps} className={className} aria-hidden="true">
                    <path d="M4.5 16.5c2-6 6.5-10.5 12.5-12.5" />
                    <path d="M12 4l2.5 2.5L12 9l-2.5-2.5L12 4z" />
                    <path d="M9 15l-1.5 4.5L12 18l3.5 1.5L14 15" />
                    <path d="M16 8l3-1-1 3" />
                </svg>
            );
        case "leaf":
            return (
                <svg {...iconProps} className={className} aria-hidden="true">
                    <path d="M12 21c-4-4.5-6-9-6-14a6 6 0 0112 0c0 5-2 9.5-6 14z" />
                    <path d="M12 7c-2 2.5-3 5-3 8" />
                </svg>
            );
        case "price":
            return (
                <svg {...iconProps} className={className} aria-hidden="true">
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M12 7.5v9" />
                    <path d="M9.5 10h4a2 2 0 110 4h-3" />
                </svg>
            );
        case "shield":
            return (
                <svg {...iconProps} className={className} aria-hidden="true">
                    <path d="M12 3.5l7 3v5.5c0 4.5-3 7.5-7 8.5-4-.9-7-4-7-8.5V6.5l7-3z" />
                    <path d="M9.5 12.5l1.8 1.8 3.7-3.9" />
                </svg>
            );
        case "refresh":
            return (
                <svg {...iconProps} className={className} aria-hidden="true">
                    <path d="M6.5 7.5A6.5 6.5 0 0118 9" />
                    <path d="M17.5 6.5V9h-2.5" />
                    <path d="M17.5 16.5A6.5 6.5 0 016 15" />
                    <path d="M6.5 17.5V15h2.5" />
                </svg>
            );
        case "checklist":
            return (
                <svg {...iconProps} className={className} aria-hidden="true">
                    <path d="M9 6h11" />
                    <path d="M9 12h11" />
                    <path d="M9 18h11" />
                    <path d="M4.5 6l1 1 2-2" />
                    <path d="M4.5 12l1 1 2-2" />
                    <path d="M4.5 18l1 1 2-2" />
                </svg>
            );
        case "chat":
            return (
                <svg {...iconProps} className={className} aria-hidden="true">
                    <path d="M5 6.5h14v9H10l-3.5 3v-3H5v-9z" />
                    <path d="M8.5 10.5h7" />
                    <path d="M8.5 13h4.5" />
                </svg>
            );
        case "request":
            return (
                <svg {...iconProps} className={className} aria-hidden="true">
                    <rect x="5" y="3.5" width="14" height="17" rx="2" />
                    <path d="M9 8h6" />
                    <path d="M9 12h6" />
                    <path d="M9 16h3.5" />
                </svg>
            );
        case "van":
            return (
                <svg {...iconProps} className={className} aria-hidden="true">
                    <path d="M3.5 8.5h11v7h-11z" />
                    <path d="M14.5 10.5h3l2.5 3v2h-5.5z" />
                    <circle cx="7" cy="17" r="1.5" />
                    <circle cx="17" cy="17" r="1.5" />
                </svg>
            );
        case "sparkle":
            return (
                <svg {...iconProps} className={className} aria-hidden="true">
                    <path d="M12 3.5l1.2 4.3L17.5 9l-4.3 1.2L12 14.5l-1.2-4.3L6.5 9l4.3-1.2L12 3.5z" />
                    <path d="M18.5 15.5l.6 2.1 2.1.6-2.1.6-.6 2.1-.6-2.1-2.1-.6 2.1-.6.6-2.1z" />
                </svg>
            );
        case "handshake":
            return (
                <svg {...iconProps} className={className} aria-hidden="true">
                    <path d="M4 12.5l3-2.5 3 2.5 2-2 3.5 3" />
                    <path d="M7 10V7.5A2 2 0 019 5.5h1.5" />
                    <path d="M17 10V7.5A2 2 0 0015 5.5H13.5" />
                </svg>
            );
        case "star":
            return (
                <svg {...iconProps} className={className} aria-hidden="true">
                    <path d="M12 4.5l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.7l5-.7L12 4.5z" />
                </svg>
            );
        case "clock":
            return (
                <svg {...iconProps} className={className} aria-hidden="true">
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M12 8v4.5l3 1.5" />
                </svg>
            );
        default:
            return null;
    }
}
