import { useEffect, useRef } from "react";

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export function useHomeScrollReveal() {
    const homeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const home = homeRef.current;
        if (!home) {
            return;
        }

        const bottomSection = home.querySelector<HTMLElement>(".home-bottom");
        if (!bottomSection) {
            return;
        }

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        let frameId = 0;

        const update = () => {
            if (reducedMotion.matches) {
                home.style.setProperty("--reveal-progress", "0");
                return;
            }

            const rect = bottomSection.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const sectionAnchor = rect.top + rect.height * 0.3;
            const revealStart = viewportHeight * 0.98;
            const revealEnd = viewportHeight * 0.32;
            const progress = clamp(
                (revealStart - sectionAnchor) / (revealStart - revealEnd),
                0,
                1,
            );

            home.style.setProperty("--reveal-progress", progress.toFixed(4));
        };

        const scheduleUpdate = () => {
            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(update);
        };

        scheduleUpdate();
        window.addEventListener("scroll", scheduleUpdate, { passive: true });
        window.addEventListener("resize", scheduleUpdate);
        reducedMotion.addEventListener("change", scheduleUpdate);

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener("scroll", scheduleUpdate);
            window.removeEventListener("resize", scheduleUpdate);
            reducedMotion.removeEventListener("change", scheduleUpdate);
        };
    }, []);

    return { homeRef };
}
