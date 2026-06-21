import { supportFaqItems } from "../../config/supportFaq";
import JsonLd from "./JsonLd";

export default function FaqPageSchema() {
    return (
        <JsonLd
            data={{
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: supportFaqItems.map((item) => ({
                    "@type": "Question",
                    name: item.question,
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: item.answer,
                    },
                })),
            }}
        />
    );
}
