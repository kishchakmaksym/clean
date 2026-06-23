import { useEffect, useRef, useState } from "react";

import { useInView } from "../../hooks/useInView";

type ProcessStep = {
    title: string;
    text: string;
};

type ProcessStepsProps = {
    steps: ProcessStep[];
};

const STEP_INTERVAL_MS = 2000;

export default function ProcessSteps({ steps }: ProcessStepsProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const { ref, isInView } = useInView<HTMLDivElement>({
        threshold: 0.15,
        rootMargin: "-24px",
    });
    const timerRef = useRef(0);

    useEffect(() => {
        if (!isInView) {
            return;
        }

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (reducedMotion.matches) {
            return;
        }

        timerRef.current = window.setInterval(() => {
            setActiveIndex((current) => (current + 1) % steps.length);
        }, STEP_INTERVAL_MS);

        return () => window.clearInterval(timerRef.current);
    }, [isInView, steps.length]);

    useEffect(() => {
        return () => {
            window.clearInterval(timerRef.current);
        };
    }, []);

    return (
        <div
            ref={ref}
            className={`hero-steps${isInView ? " hero-steps--live" : ""}`}
        >
            {steps.map((step, index) => {
                const isActive = index === activeIndex;
                const isLast = index === steps.length - 1;

                return (
                    <article
                        key={step.title}
                        className={`hero-step${isActive ? " hero-step--active" : ""}`}
                    >
                        <div className="hero-step-rail" aria-hidden="true">
                            <div className="hero-step-number">{String(index + 1).padStart(2, "0")}</div>
                            {!isLast && (
                                <div
                                    className={`hero-step-segment${
                                        index < activeIndex ? " hero-step-segment--filled" : ""
                                    }`}
                                />
                            )}
                        </div>

                        <div className="hero-step-body">
                            <h3>{step.title}</h3>
                            <p>{step.text}</p>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
