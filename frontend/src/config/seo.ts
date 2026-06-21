/** Бренд сайту — завжди Smart Clean. */
export const SITE_NAME = "Smart Clean";

export const SITE_TAGLINE = "Професійний клінінг в Ужгороді";

export const SITE_DESCRIPTION =
    "Професійне прибирання квартир, будинків та офісів в Ужгороді, Минаї та Сторожниці. Smart Clean — акуратно, в зручний час, з гарантією якості.";

export const SITE_KEYWORDS =
    "клінінг ужгород, прибирання квартири ужгород, smart clean, генеральне прибирання ужгород, клінінг минаї, клінінг сторожниця, прибирання офісу ужгород";

export const SERVICE_AREAS = ["Ужгород", "Минаї", "Сторожниця"] as const;

export const DEFAULT_OG_IMAGE = "/logo.gif";

export type PageMetaConfig = {
    title: string;
    description: string;
    path: string;
    noindex?: boolean;
    h1?: string;
};

export function getSiteUrl(): string {
    const envUrl = import.meta.env.VITE_SITE_URL as string | undefined;
    if (envUrl?.trim()) {
        return envUrl.trim().replace(/\/$/, "");
    }

    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    return "https://smartclean.com.ua";
}

export function getCanonicalUrl(path: string): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${getSiteUrl()}${normalizedPath === "/" ? "/" : normalizedPath}`;
}

export function formatPageTitle(pageTitle?: string): string {
    if (!pageTitle) {
        return `${SITE_TAGLINE} — ${SITE_NAME}`;
    }

    return `${pageTitle} — ${SITE_NAME}`;
}

export const PAGE_SEO = {
    home: {
        title: formatPageTitle("Клінінг в Ужгороді"),
        description: SITE_DESCRIPTION,
        path: "/",
        h1: "Клінінг в Ужгороді, Минаї та Сторожниці",
    },
    services: {
        title: formatPageTitle("Послуги та ціни"),
        description:
            "Замовте прибирання квартири, будинку або офісу в Ужгороді. Фіксовані пакети, кастомне та генеральне прибирання, прибирання після ремонту. Розрахуйте вартість онлайн — Smart Clean.",
        path: "/services",
        h1: "Послуги клінінгу Smart Clean в Ужгороді",
    },
    reviews: {
        title: formatPageTitle("Відгуки клієнтів"),
        description:
            "Реальні відгуки про Smart Clean — клінінг в Ужгороді. Дізнайтесь, що кажуть клієнти про якість прибирання, пунктуальність і сервіс.",
        path: "/reviews",
        h1: "Відгуки про Smart Clean",
    },
    faq: {
        title: formatPageTitle("Часті питання"),
        description:
            "Відповіді на часті питання про замовлення клінінгу в Ужгороді: ціни, оплата, скасування, засоби, регулярне прибирання та інше — Smart Clean.",
        path: "/faq",
        h1: "Часті питання про Smart Clean",
    },
    vacancies: {
        title: formatPageTitle("Вакансії"),
        description:
            "Робота прибиральницею в Smart Clean — Ужгород та околиці. Стабільні замовлення, гнучкий графік, все необхідне для роботи надаємо.",
        path: "/vacancies",
        h1: "Робота в Smart Clean",
    },
    login: {
        title: formatPageTitle("Вхід"),
        description: "Увійдіть в акаунт Smart Clean, щоб замовити прибирання в Ужгороді.",
        path: "/login",
        noindex: true,
    },
    profile: {
        title: formatPageTitle("Профіль"),
        description: "Особистий кабінет Smart Clean.",
        path: "/profile",
        noindex: true,
    },
    admin: {
        title: formatPageTitle("Адміністрування"),
        description: "Панель адміністратора Smart Clean.",
        path: "/admin",
        noindex: true,
    },
    fallback: {
        title: formatPageTitle(undefined),
        description: SITE_DESCRIPTION,
        path: "/",
    },
} as const satisfies Record<string, PageMetaConfig>;

export const PUBLIC_SITEMAP_ROUTES = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/services", changefreq: "weekly", priority: "0.9" },
    { path: "/reviews", changefreq: "weekly", priority: "0.8" },
    { path: "/faq", changefreq: "monthly", priority: "0.7" },
    { path: "/vacancies", changefreq: "monthly", priority: "0.5" },
] as const;

export function getPageMeta(pathname: string): PageMetaConfig {
    switch (pathname) {
        case "/":
            return PAGE_SEO.home;
        case "/services":
            return PAGE_SEO.services;
        case "/reviews":
            return PAGE_SEO.reviews;
        case "/faq":
            return PAGE_SEO.faq;
        case "/vacancies":
            return PAGE_SEO.vacancies;
        case "/login":
            return PAGE_SEO.login;
        case "/admin":
            return PAGE_SEO.admin;
        default:
            if (pathname.startsWith("/profile")) {
                return { ...PAGE_SEO.profile, path: pathname };
            }
            return PAGE_SEO.fallback;
    }
}
