import { useLocation } from "react-router-dom";

import { getPageMeta } from "../../config/seo";
import { usePageMeta } from "../../hooks/usePageMeta";
import FaqPageSchema from "./FaqPageSchema";
import LocalBusinessSchema from "./LocalBusinessSchema";
import "./Seo.css";

const PAGES_WITH_VISIBLE_H1 = new Set(["/", "/reviews", "/faq", "/vacancies"]);

export default function RouteSeo() {
    const { pathname } = useLocation();
    const meta = getPageMeta(pathname);
    const needsHiddenH1 = meta.h1 != null && !PAGES_WITH_VISIBLE_H1.has(pathname);

    usePageMeta(meta);

    return (
        <>
            {needsHiddenH1 ? <h1 className="seo-visually-hidden">{meta.h1}</h1> : null}
            <LocalBusinessSchema />
            {pathname === "/faq" ? <FaqPageSchema /> : null}
        </>
    );
}
