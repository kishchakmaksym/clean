import { supportFaqItems, type SupportFaqItem } from "../../config/supportFaq";
import "./FaqAccordion.css";

type FaqAccordionProps = {
    items?: SupportFaqItem[];
    compact?: boolean;
    className?: string;
};

export default function FaqAccordion({
    items = supportFaqItems,
    compact = false,
    className = "",
}: FaqAccordionProps) {
    return (
        <div className={`faq-accordion${compact ? " faq-accordion--compact" : ""} ${className}`.trim()}>
            {items.map((item, index) => (
                <details key={item.id} className="faq-accordion-item" open={!compact && index === 0}>
                    <summary className="faq-accordion-summary">
                        <span className="faq-accordion-question">{item.question}</span>
                        <span className="faq-accordion-icon" aria-hidden="true" />
                    </summary>
                    <div className="faq-accordion-answer">
                        <p>{item.answer}</p>
                    </div>
                </details>
            ))}
        </div>
    );
}
