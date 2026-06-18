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
                home.style.setProperty("--reveal-progress-bottom", "0");
                return;
            }

            const viewportHeight = window.innerHeight;
            const scrollY = window.scrollY;
            const sectionOffset = bottomSection.offsetTop;

            const endScrollTop = Math.max(
                viewportHeight * 0.18,
                sectionOffset - viewportHeight * 0.72,
            );
            const endScrollBottom = Math.max(
                viewportHeight * 0.48,
                sectionOffset - viewportHeight * 0.24,
            );

            const progress = clamp(scrollY / endScrollTop, 0, 1);
            const bottomRaw = clamp(scrollY / endScrollBottom, 0, 1);
            const bottomProgress = Math.pow(bottomRaw, 1.2);

            home.style.setProperty("--reveal-progress", progress.toFixed(4));
            home.style.setProperty("--reveal-progress-bottom", bottomProgress.toFixed(4));
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
