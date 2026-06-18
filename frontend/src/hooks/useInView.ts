import { useEffect, useRef, useState } from "react";

type UseInViewOptions = {
    threshold?: number;
    rootMargin?: string;
    once?: boolean;
};

export function useInView<T extends Element>({
    threshold = 0.2,
    rootMargin = "0px",
    once = true,
}: UseInViewOptions = {}) {
    const ref = useRef<T>(null);
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    if (once) {
                        observer.disconnect();
                    }
                } else if (!once) {
                    setIsInView(false);
                }
            },
            { threshold, rootMargin },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [once, rootMargin, threshold]);

    return { ref, isInView };
}
