import { useLayoutEffect, useRef, useState } from "react";

type ReviewCardTextProps = {
    text: string;
    onReadMore: () => void;
    blockClassName?: string;
    textClassName?: string;
    clampClassName?: string;
    toggleClassName?: string;
};

export default function ReviewCardText({
    text,
    onReadMore,
    blockClassName = "review-text-block",
    textClassName = "review-text",
    clampClassName = "review-text--clamped",
    toggleClassName = "review-toggle",
}: ReviewCardTextProps) {
    const trimmed = text.trim();
    const textRef = useRef<HTMLParagraphElement>(null);
    const [isClamped, setIsClamped] = useState(false);

    useLayoutEffect(() => {
        const element = textRef.current;
        if (!element || !trimmed) {
            setIsClamped(false);
            return;
        }

        element.classList.add(clampClassName);
        const truncated = element.scrollHeight > element.clientHeight + 1;
        if (!truncated) {
            element.classList.remove(clampClassName);
        }
        setIsClamped(truncated);
    }, [clampClassName, trimmed]);

    if (!trimmed) {
        return null;
    }

    return (
        <div className={blockClassName}>
            <p
                ref={textRef}
                className={`${textClassName}${isClamped ? ` ${clampClassName}` : ""}`}
            >
                {trimmed}
            </p>
            {isClamped ? (
                <button type="button" className={toggleClassName} onClick={onReadMore}>
                    Читати повністю
                </button>
            ) : null}
        </div>
    );
}
