import { supportContacts } from "../../config/contacts";
import {
    getCanonicalUrl,
    getSiteUrl,
    SERVICE_AREAS,
    SITE_DESCRIPTION,
    SITE_NAME,
} from "../../config/seo";
import { useReviewStats } from "../../hooks/useReviewStats";
import JsonLd from "./JsonLd";

export default function LocalBusinessSchema() {
    const { averageRating, reviewCount, loading } = useReviewStats();
    const siteUrl = getSiteUrl();

    const schema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": `${siteUrl}/#website`,
                url: siteUrl,
                name: SITE_NAME,
                description: SITE_DESCRIPTION,
                inLanguage: "uk-UA",
            },
            {
                "@type": "LocalBusiness",
                "@id": `${siteUrl}/#localbusiness`,
                name: SITE_NAME,
                description: SITE_DESCRIPTION,
                url: siteUrl,
                image: getCanonicalUrl("/logo.gif"),
                email: supportContacts.email,
                priceRange: "$$",
                areaServed: SERVICE_AREAS.map((city) => ({
                    "@type": "City",
                    name: city,
                })),
                address: {
                    "@type": "PostalAddress",
                    addressLocality: "Ужгород",
                    addressRegion: "Закарпатська область",
                    addressCountry: "UA",
                },
                geo: {
                    "@type": "GeoCoordinates",
                    latitude: 48.6208,
                    longitude: 22.2879,
                },
                openingHoursSpecification: [
                    {
                        "@type": "OpeningHoursSpecification",
                        dayOfWeek: [
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                            "Sunday",
                        ],
                        opens: "08:00",
                        closes: "20:00",
                    },
                ],
                sameAs: [],
                hasOfferCatalog: {
                    "@type": "OfferCatalog",
                    name: "Послуги клінінгу",
                    itemListElement: [
                        {
                            "@type": "Offer",
                            itemOffered: {
                                "@type": "Service",
                                name: "Прибирання квартири",
                                areaServed: "Ужгород",
                            },
                        },
                        {
                            "@type": "Offer",
                            itemOffered: {
                                "@type": "Service",
                                name: "Генеральне прибирання",
                                areaServed: "Ужгород",
                            },
                        },
                        {
                            "@type": "Offer",
                            itemOffered: {
                                "@type": "Service",
                                name: "Прибирання після ремонту",
                                areaServed: "Ужгород",
                            },
                        },
                        {
                            "@type": "Offer",
                            itemOffered: {
                                "@type": "Service",
                                name: "Прибирання офісу",
                                areaServed: "Ужгород",
                            },
                        },
                    ],
                },
            },
        ],
    };

    if (!loading && reviewCount > 0 && averageRating != null) {
        const businessNode = (schema["@graph"] as Record<string, unknown>[])[1];
        businessNode.aggregateRating = {
            "@type": "AggregateRating",
            ratingValue: averageRating.toFixed(1),
            reviewCount,
            bestRating: 5,
            worstRating: 1,
        };
    }

    return <JsonLd data={schema} />;
}
