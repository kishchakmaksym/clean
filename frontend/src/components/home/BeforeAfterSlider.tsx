import {
    type CSSProperties,
    type PointerEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import "./BeforeAfterSlider.css";

type ComparisonPair = {
    id: string;
    before: string;
    after: string;
    label: string;
};

const COMPARISONS: ComparisonPair[] = [
    {
        id: "room-1",
        before: "/1.png",
        after: "/2.png",
        label: "Кімната",
    },
    {
        id: "room-2",
        before: "/3.png",
        after: "/4.png",
        label: "Житлова зона",
    },
    {
        id: "bedroom",
        before: "/5.png",
        after: "/6.png",
        label: "Спальня",
    },
    {
        id: "kitchen",
        before: "/7.png",
        after: "/8.png",
        label: "Кухня",
    },
    {
        id: "bathroom",
        before: "/9.png",
        after: "/10.png",
        label: "Ванна",
    },
];

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export default function BeforeAfterSlider() {
    const [pairIndex, setPairIndex] = useState(0);
    const [position, setPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);

    const viewportRef = useRef<HTMLDivElement>(null);
    const sliderRef = useRef<HTMLDivElement>(null);
    const beforeImgRef = useRef<HTMLImageElement>(null);
    const dividerRef = useRef<HTMLDivElement>(null);
    const positionRef = useRef(50);
    const frameRef = useRef(0);
    const introFrameRef = useRef(0);
    const stepDirectionRef = useRef(1);

    const lastIndex = COMPARISONS.length - 1;

    const applyPosition = useCallback((next: number, syncState = false) => {
        const clamped = clamp(next, 0, 100);
        positionRef.current = clamped;

        if (beforeImgRef.current) {
            beforeImgRef.current.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
        }

        if (dividerRef.current) {
            dividerRef.current.style.left = `${clamped}%`;
        }

        if (syncState) {
            setPosition(clamped);
        }
    }, []);

    const syncViewportWidth = useCallback(() => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }

        viewport.style.setProperty("--ba-slide-w", `${viewport.clientWidth}px`);
    }, []);

    useEffect(() => {
        syncViewportWidth();
        applyPosition(50, true);
    }, [applyPosition, pairIndex, syncViewportWidth]);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }

        syncViewportWidth();
        const observer = new ResizeObserver(syncViewportWidth);
        observer.observe(viewport);

        return () => observer.disconnect();
    }, [syncViewportWidth]);

    useEffect(() => {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (reducedMotion.matches) {
            return;
        }

        const start = performance.now();
        const duration = 1450;
        const amplitude = 26;

        const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const envelope = Math.sin(progress * Math.PI);
            const sweep = Math.sin(progress * Math.PI * 2) * envelope;
            applyPosition(50 + sweep * amplitude);

            if (progress < 1) {
                introFrameRef.current = requestAnimationFrame(animate);
            } else {
                applyPosition(50, true);
            }
        };

        introFrameRef.current = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(introFrameRef.current);
    }, [applyPosition, pairIndex]);

    const schedulePosition = useCallback(
        (clientX: number) => {
            const slider = sliderRef.current;
            if (!slider) {
                return;
            }

            cancelAnimationFrame(frameRef.current);
            frameRef.current = requestAnimationFrame(() => {
                const rect = slider.getBoundingClientRect();
                if (rect.width <= 0) {
                    return;
                }

                const next = ((clientX - rect.left) / rect.width) * 100;
                applyPosition(next);
            });
        },
        [applyPosition],
    );

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
        cancelAnimationFrame(introFrameRef.current);
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsDragging(true);
        schedulePosition(event.clientX);
    };

    const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (!isDragging) {
            return;
        }

        schedulePosition(event.clientX);
    };

    const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        setIsDragging(false);
        applyPosition(positionRef.current, true);
    };

    const goToPair = (nextIndex: number) => {
        const clampedIndex = clamp(nextIndex, 0, lastIndex);
        setPairIndex(clampedIndex);
        setPosition(50);
        positionRef.current = 50;

        if (clampedIndex <= 0) {
            stepDirectionRef.current = 1;
        } else if (clampedIndex >= lastIndex) {
            stepDirectionRef.current = -1;
        }
    };

    const goToPrev = () => {
        if (pairIndex <= 0) {
            stepDirectionRef.current = 1;
            goToPair(1);
            return;
        }

        goToPair(pairIndex - 1);
    };

    const goToNext = () => {
        if (pairIndex >= lastIndex) {
            stepDirectionRef.current = -1;
            goToPair(lastIndex - 1);
            return;
        }

        goToPair(pairIndex + 1);
    };

    return (
        <div className="ba-slider-wrap">
            <div className="ba-slider-head">
                <span className="badge hero-badge">Результат</span>
                <h2 className="ba-slider-title">До і після прибирання</h2>
                <p className="ba-slider-lead">
                    Перетягніть повзунок — побачите різницю, яку ми залишаємо після кожного візиту.
                </p>
            </div>

            <div className="ba-slider-stage">
                <button
                    type="button"
                    className="ba-stage-arrow ba-stage-arrow--prev"
                    onClick={goToPrev}
                    aria-label="Попередній приклад"
                >
                    ‹
                </button>

                <div ref={viewportRef} className="ba-carousel-viewport">
                    <div
                        className="ba-carousel-track"
                        style={{ "--ba-index": pairIndex } as CSSProperties}
                    >
                        {COMPARISONS.map((item, index) => {
                            const isActive = index === pairIndex;

                            return (
                                <div
                                    key={item.id}
                                    className={`ba-slide${isActive ? " ba-slide--active" : ""}`}
                                    aria-hidden={!isActive}
                                >
                                    <div
                                        ref={isActive ? sliderRef : undefined}
                                        className={`ba-slider${isActive && isDragging ? " ba-slider--dragging" : ""}`}
                                        onPointerDown={isActive ? handlePointerDown : undefined}
                                        onPointerMove={isActive ? handlePointerMove : undefined}
                                        onPointerUp={isActive ? handlePointerUp : undefined}
                                        onPointerCancel={isActive ? handlePointerUp : undefined}
                                    >
                                        <img
                                            className="ba-photo ba-photo--after"
                                            src={item.after}
                                            alt={`${item.label} після прибирання`}
                                            draggable={false}
                                            loading={isActive ? "eager" : "lazy"}
                                        />

                                        <img
                                            ref={isActive ? beforeImgRef : undefined}
                                            className="ba-photo ba-photo--before"
                                            src={item.before}
                                            alt={`${item.label} до прибирання`}
                                            draggable={false}
                                            loading={isActive ? "eager" : "lazy"}
                                        />

                                        {isActive ? (
                                            <>
                                                <span className="ba-label ba-label--before">До</span>
                                                <span className="ba-label ba-label--after">Після</span>

                                                <div ref={dividerRef} className="ba-divider">
                                                    <span className="ba-handle" />
                                                </div>

                                                <input
                                                    className="ba-range"
                                                    type="range"
                                                    min={0}
                                                    max={100}
                                                    step={0.1}
                                                    value={position}
                                                    onChange={(event) =>
                                                        applyPosition(Number(event.target.value), true)
                                                    }
                                                    aria-label="Порівняння до і після прибирання"
                                                />
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button
                    type="button"
                    className="ba-stage-arrow ba-stage-arrow--next"
                    onClick={goToNext}
                    aria-label="Наступний приклад"
                >
                    ›
                </button>
            </div>

            <p className="ba-slider-hint">
                <span className="ba-slider-hint-arrow" aria-hidden="true">
                    ↔
                </span>
                Тягни повзунок на фото
            </p>

            <div className="ba-dots" role="tablist" aria-label="Приклади прибирання">
                {COMPARISONS.map((item, index) => (
                    <button
                        key={item.id}
                        type="button"
                        role="tab"
                        className={`ba-dot${index === pairIndex ? " ba-dot--active" : ""}`}
                        aria-selected={index === pairIndex}
                        aria-label={item.label}
                        onClick={() => goToPair(index)}
                    />
                ))}
            </div>

            <p className="ba-privacy-note">
                Приклади на сайті — лише за згодою клієнтів. Без вашої попередньої згоди ми не здійснюємо фотозйомку та не публікуємо зображення вашого приміщення.
            </p>
        </div>
    );
}
