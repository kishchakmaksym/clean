import { useEffect, useState } from "react";

function easeOutCubic(value: number) {
    return 1 - Math.pow(1 - value, 3);
}

type UseCountUpOptions = {
    end: number;
    duration?: number;
    decimals?: number;
    enabled?: boolean;
};

export function useCountUp({
    end,
    duration = 1400,
    decimals = 0,
    enabled = true,
}: UseCountUpOptions) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!enabled) {
            setValue(0);
            return;
        }

        let frameId = 0;
        const start = performance.now();

        const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const nextValue = end * easeOutCubic(progress);
            setValue(nextValue);

            if (progress < 1) {
                frameId = requestAnimationFrame(tick);
            }
        };

        frameId = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frameId);
    }, [duration, enabled, end, decimals]);

    const formatted =
        decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));

    return formatted;
}