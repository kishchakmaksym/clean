import { useEffect } from "react";

export function useSupportTypingPulse(active: boolean, pulse: () => void) {
    useEffect(() => {
        if (!active) {
            return;
        }

        pulse();

        const intervalId = window.setInterval(pulse, 2000);
        return () => window.clearInterval(intervalId);
    }, [active, pulse]);
}

export function scrollSupportMessagesToBottom(
    container: HTMLElement | null,
    behavior: ScrollBehavior = "smooth",
) {
    if (!container) {
        return;
    }

    container.scrollTo({
        top: container.scrollHeight,
        behavior,
    });
}
