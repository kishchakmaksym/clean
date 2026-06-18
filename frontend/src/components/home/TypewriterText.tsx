import { useEffect, useState } from "react";

import { useInView } from "../../hooks/useInView";

type TypewriterTextProps = {
    text: string;
    speed?: number;
    className?: string;
};

export default function TypewriterText({
    text,
    speed = 42,
    className,
}: TypewriterTextProps) {
    const { ref, isInView } = useInView<HTMLSpanElement>({ threshold: 0.6 });
    const [displayed, setDisplayed] = useState("");
    const [isDone, setIsDone] = useState(false);

    useEffect(() => {
        if (!isInView) {
            return;
        }

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (reducedMotion.matches) {
            setDisplayed(text);
            setIsDone(true);
            return;
        }

        let index = 0;
        setDisplayed("");
        setIsDone(false);

        const intervalId = window.setInterval(() => {
            index += 1;
            setDisplayed(text.slice(0, index));

            if (index >= text.length) {
                window.clearInterval(intervalId);
                setIsDone(true);
            }
        }, speed);

        return () => window.clearInterval(intervalId);
    }, [isInView, speed, text]);

    return (
        <span
            ref={ref}
            className={`typewriter-text${isDone ? " typewriter-text--done" : ""}${className ? ` ${className}` : ""}`}
        >
            {displayed}
            {!isDone && isInView ? <span className="typewriter-cursor" aria-hidden="true" /> : null}
        </span>
    );
}
