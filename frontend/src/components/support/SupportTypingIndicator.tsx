import "./SupportTypingIndicator.css";

type SupportTypingIndicatorProps = {
    align?: "start" | "end";
    className?: string;
};

export default function SupportTypingIndicator({
    align = "start",
    className = "",
}: SupportTypingIndicatorProps) {
    return (
        <div
            className={`support-typing support-typing--${align} ${className}`.trim()}
            role="status"
            aria-label="Друкує"
        >
            <span className="support-typing-dot" />
            <span className="support-typing-dot" />
            <span className="support-typing-dot" />
        </div>
    );
}
