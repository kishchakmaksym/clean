import { type ReactNode } from "react";

import { useInView } from "../../hooks/useInView";

type RevealItemProps = {
    children: ReactNode;
    index: number;
    className?: string;
};

export default function RevealItem({ children, index, className }: RevealItemProps) {
    const { ref, isInView } = useInView<HTMLElement>({ threshold: 0.15 });
    const delay = `${index * 90}ms`;

    return (
        <article
            ref={ref}
            className={`${className ?? ""}${isInView ? " reveal-item--visible" : ""}`.trim()}
            style={{ transitionDelay: delay }}
        >
            {children}
        </article>
    );
}
