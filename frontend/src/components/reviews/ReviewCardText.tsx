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
    const [isTruncated, setIsTruncated] = useState(false);

    useLayoutEffect(() => {
        const element = textRef.current;
        if (!element || !trimmed) {
            setIsTruncated(false);
            return;
        }

        setIsTruncated(element.scrollHeight > element.clientHeight + 1);
    }, [trimmed]);

    if (!trimmed) {
        return null;
    }

    return (
        <div className={blockClassName}>
            <p ref={textRef} className={`${textClassName} ${clampClassName}`}>
                {trimmed}
            </p>
            <button
                type="button"
                className={`${toggleClassName}${isTruncated ? "" : ` ${toggleClassName}--placeholder`}`}
                onClick={onReadMore}
                tabIndex={isTruncated ? 0 : -1}
                aria-hidden={!isTruncated}
            >
                Читати повністю
            </button>
        </div>
    );
}
