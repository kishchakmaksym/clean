import { useCountUp } from "../../hooks/useCountUp";
import { useInView } from "../../hooks/useInView";

type CountUpMetricProps = {
    value: number;
    suffix?: string;
    prefix?: string;
    decimals?: number;
    label: string;
};

export default function CountUpMetric({
    value,
    suffix = "",
    prefix = "",
    decimals = 0,
    label,
}: CountUpMetricProps) {
    const { ref, isInView } = useInView<HTMLDivElement>({ threshold: 0.35 });
    const displayed = useCountUp({
        end: value,
        decimals,
        enabled: isInView,
    });

    return (
        <div className="metric" ref={ref}>
            <div className="metric-value">
                {prefix}
                {displayed}
                {suffix}
            </div>
            <div className="metric-label">{label}</div>
        </div>
    );
}

type MetricRangeProps = {
    from: number;
    to: number;
    suffix: string;
    label: string;
};

export function MetricRange({ from, to, suffix, label }: MetricRangeProps) {
    const { ref, isInView } = useInView<HTMLDivElement>({ threshold: 0.35 });
    const fromValue = useCountUp({ end: from, enabled: isInView });
    const toValue = useCountUp({ end: to, enabled: isInView, duration: 1600 });

    return (
        <div className={`metric metric--range${isInView ? " metric--visible" : ""}`} ref={ref}>
            <div className="metric-value">
                {fromValue}–{toValue}
                {suffix}
            </div>
            <div className="metric-label">{label}</div>
        </div>
    );
}
