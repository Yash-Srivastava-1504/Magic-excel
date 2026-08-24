import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Native (un-scaled) width of the demo content in px */
  baseWidth?: number;
  /** Native (un-scaled) height of the demo content in px */
  baseHeight?: number;
  /** Minimum scale to apply (prevents content from getting unreadable) */
  minScale?: number;
}

/**
 * Wraps fixed-size demo content and uniformly scales it down to fit the
 * available width on smaller viewports. Uses CSS transform: scale() which
 * preserves getBoundingClientRect math used by the animated cursor.
 */
export function ResponsiveDemoFrame({
  children,
  baseWidth = 920,
  baseHeight = 540,
  minScale = 0.4,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const update = () => {
      const available = el.clientWidth;
      const next = Math.min(1, Math.max(minScale, available / baseWidth));
      setScale(next);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [baseWidth, minScale]);

  return (
    <div ref={wrapperRef} className="w-full" style={{ height: baseHeight * scale }}>
      <div
        style={{
          width: baseWidth,
          height: baseHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
