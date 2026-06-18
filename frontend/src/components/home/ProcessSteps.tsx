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
const RESUME_DELAY_MS = 1000;

export default function ProcessSteps({ steps }: ProcessStepsProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const { ref, isInView } = useInView<HTMLDivElement>({
        threshold: 0.15,
        rootMargin: "-24px",
    });
    const timerRef = useRef(0);
    const resumeTimerRef = useRef(0);

    useEffect(() => {
        if (!isInView || isPaused) {
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
    }, [isInView, isPaused, steps.length]);

    useEffect(() => {
        return () => {
            window.clearInterval(timerRef.current);
            window.clearTimeout(resumeTimerRef.current);
        };
    }, []);

    const pauseCycle = () => {
        window.clearTimeout(resumeTimerRef.current);
        setIsPaused(true);
    };

    const scheduleResume = () => {
        window.clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = window.setTimeout(() => {
            setIsPaused(false);
        }, RESUME_DELAY_MS);
    };

    const activateStep = (index: number) => {
        setActiveIndex(index);
    };

    return (
        <div
            ref={ref}
            className={`hero-steps${isInView ? " hero-steps--live" : ""}`}
            onMouseEnter={pauseCycle}
            onMouseLeave={scheduleResume}
            onFocusCapture={pauseCycle}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    scheduleResume();
                }
            }}
        >
            {steps.map((step, index) => {
                const isActive = index === activeIndex;
                const isLast = index === steps.length - 1;

                return (
                    <article
                        key={step.title}
                        className={`hero-step${isActive ? " hero-step--active" : ""}`}
                        tabIndex={0}
                        onMouseEnter={() => activateStep(index)}
                        onFocus={() => activateStep(index)}
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
