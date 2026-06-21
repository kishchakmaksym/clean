import { useEffect } from "react";

import {
    DEFAULT_OG_IMAGE,
    getCanonicalUrl,
    SITE_KEYWORDS,
    SITE_NAME,
    type PageMetaConfig,
} from "../config/seo";

type MetaDescriptor = {
    attr: "name" | "property";
    key: string;
    content: string;
};

function upsertMeta({ attr, key, content }: MetaDescriptor) {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);

    if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, key);
        document.head.appendChild(element);
    }

    element.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
    let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

    if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", rel);
        document.head.appendChild(element);
    }

    element.setAttribute("href", href);
}

function removeMeta({ attr, key }: Pick<MetaDescriptor, "attr" | "key">) {
    document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

export function usePageMeta(meta: PageMetaConfig) {
    useEffect(() => {
        const previousTitle = document.title;
        const canonicalUrl = getCanonicalUrl(meta.path);
        const imageUrl = getCanonicalUrl(DEFAULT_OG_IMAGE);

        document.title = meta.title;

        upsertMeta({ attr: "name", key: "description", content: meta.description });
        upsertMeta({ attr: "name", key: "keywords", content: SITE_KEYWORDS });
        upsertMeta({ attr: "name", key: "author", content: SITE_NAME });
        upsertMeta({
            attr: "name",
            key: "robots",
            content: meta.noindex ? "noindex, nofollow" : "index, follow",
        });

        upsertLink("canonical", canonicalUrl);

        upsertMeta({ attr: "property", key: "og:type", content: "website" });
        upsertMeta({ attr: "property", key: "og:site_name", content: SITE_NAME });
        upsertMeta({ attr: "property", key: "og:locale", content: "uk_UA" });
        upsertMeta({ attr: "property", key: "og:title", content: meta.title });
        upsertMeta({ attr: "property", key: "og:description", content: meta.description });
        upsertMeta({ attr: "property", key: "og:url", content: canonicalUrl });
        upsertMeta({ attr: "property", key: "og:image", content: imageUrl });

        upsertMeta({ attr: "name", key: "twitter:card", content: "summary_large_image" });
        upsertMeta({ attr: "name", key: "twitter:title", content: meta.title });
        upsertMeta({ attr: "name", key: "twitter:description", content: meta.description });
        upsertMeta({ attr: "name", key: "twitter:image", content: imageUrl });

        return () => {
            document.title = previousTitle;
            removeMeta({ attr: "name", key: "robots" });
        };
    }, [meta.description, meta.noindex, meta.path, meta.title]);
}
