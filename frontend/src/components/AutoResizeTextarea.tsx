import { useCallback, useEffect, useRef } from "react";

type AutoResizeTextareaProps = {
    value: string;
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    className?: string;
    placeholder?: string;
    rows?: number;
};

export default function AutoResizeTextarea({
    value,
    onChange,
    className,
    placeholder,
    rows = 3,
}: AutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const syncHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) {
            return;
        }

        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
    }, []);

    useEffect(() => {
        syncHeight();
    }, [value, syncHeight]);

    return (
        <textarea
            ref={textareaRef}
            className={className}
            rows={rows}
            value={value}
            placeholder={placeholder}
            onChange={onChange}
        />
    );
}
