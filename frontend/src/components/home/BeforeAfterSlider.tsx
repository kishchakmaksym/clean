import {
  type CSSProperties,
  type PointerEvent,
  type TransitionEvent,
  useCallback,
  useEffect,
  useMemo,
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

const SLIDE_COUNT = COMPARISONS.length;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getLogicalIndex(trackIndex: number) {
  if (trackIndex <= 0) {
    return SLIDE_COUNT - 1;
  }

  if (trackIndex >= SLIDE_COUNT + 1) {
    return 0;
  }

  return trackIndex - 1;
}

export default function BeforeAfterSlider() {
  const extendedSlides = useMemo(
    () => [COMPARISONS[SLIDE_COUNT - 1]!, ...COMPARISONS, COMPARISONS[0]!],

    [],
  );

  const [trackIndex, setTrackIndex] = useState(1);

  const [transitionEnabled, setTransitionEnabled] = useState(true);

  const [position, setPosition] = useState(50);

  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);

  const trackRef = useRef<HTMLDivElement>(null);

  const sliderRef = useRef<HTMLDivElement>(null);

  const beforeImgRef = useRef<HTMLImageElement>(null);

  const dividerRef = useRef<HTMLDivElement>(null);

  const positionRef = useRef(50);

  const frameRef = useRef(0);

  const introFrameRef = useRef(0);

  const isJumpingRef = useRef(false);

  const pairIndex = getLogicalIndex(trackIndex);

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

  const resetSliderPosition = useCallback(() => {
    setPosition(50);

    positionRef.current = 50;
  }, []);

  useEffect(() => {
    syncViewportWidth();

    applyPosition(50, true);
  }, [applyPosition, syncViewportWidth, trackIndex]);

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

  const jumpWithoutTransition = useCallback(
    (nextTrackIndex: number) => {
      isJumpingRef.current = true;

      setTransitionEnabled(false);

      setTrackIndex(nextTrackIndex);

      resetSliderPosition();

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionEnabled(true);

          isJumpingRef.current = false;
        });
      });
    },
    [resetSliderPosition],
  );

  const handleTrackTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (isJumpingRef.current || event.propertyName !== "transform") {
      return;
    }

    if (event.currentTarget !== trackRef.current) {
      return;
    }

    if (trackIndex === 0) {
      jumpWithoutTransition(SLIDE_COUNT);

      return;
    }

    if (trackIndex === SLIDE_COUNT + 1) {
      jumpWithoutTransition(1);
    }
  };

  const goToPair = (nextIndex: number) => {
    const clampedIndex = clamp(nextIndex, 0, SLIDE_COUNT - 1);

    setTrackIndex(clampedIndex + 1);

    resetSliderPosition();
  };

  const goToPrev = () => {
    if (!transitionEnabled) {
      return;
    }

    setTrackIndex((current) => current - 1);

    resetSliderPosition();
  };

  const goToNext = () => {
    if (!transitionEnabled) {
      return;
    }

    setTrackIndex((current) => current + 1);

    resetSliderPosition();
  };

  return (
    <div className="ba-slider-wrap">
      <div className="ba-slider-head">
        <span className="badge hero-badge">Результат</span>

        <h2 className="ba-slider-title">До і після прибирання</h2>

        <p className="ba-slider-lead">
          Перетягніть повзунок — побачите різницю, яку ми залишаємо після
          кожного візиту.
        </p>
      </div>

      <div className="ba-slider-stage">
        <div className="ba-slider-carousel">
          <div ref={viewportRef} className="ba-carousel-viewport">
            <div
              ref={trackRef}
              className={`ba-carousel-track${transitionEnabled ? "" : " ba-carousel-track--instant"}`}
              style={{ "--ba-index": trackIndex } as CSSProperties}
              onTransitionEnd={handleTrackTransitionEnd}
            >
              {extendedSlides.map((item, index) => {
                const isActive = index === trackIndex;

                return (
                  <div
                    key={`${item.id}-${index}`}
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

          <div className="ba-slider-nav">
            <button
              type="button"
              className="ba-stage-arrow ba-stage-arrow--prev"
              onClick={goToPrev}
              aria-label="Попередній приклад"
            >
              ‹
            </button>

            <button
              type="button"
              className="ba-stage-arrow ba-stage-arrow--next"
              onClick={goToNext}
              aria-label="Наступний приклад"
            >
              ›
            </button>
          </div>
        </div>
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
        Приклади на сайті — лише за згодою клієнтів. Без вашої попередньої згоди
        ми не здійснюємо фотозйомку та не публікуємо зображення вашого
        приміщення.
      </p>
    </div>
  );
}
