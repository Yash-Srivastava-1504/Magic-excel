import { useLayoutEffect, useState, type RefObject } from "react";
import type { CursorTarget } from "./AnimatedCursor";
import type { StepCursor } from "./useDemoSequence";

const ALIGN_POINTS = {
  center: { x: 0.5, y: 0.5 },
  "top-left": { x: 0, y: 0 },
  "top-right": { x: 1, y: 0 },
  "bottom-left": { x: 0, y: 1 },
  "bottom-right": { x: 1, y: 1 },
} as const;

export function useAnchoredCursor(
  containerRef: RefObject<HTMLElement | null>,
  cursor?: StepCursor,
): CursorTarget {
  const [target, setTarget] = useState<CursorTarget>(() => ({
    x: cursor?.x ?? 0,
    y: cursor?.y ?? 0,
    click: cursor?.click,
  }));

  useLayoutEffect(() => {
    if (!cursor) {
      setTarget({ x: 0, y: 0 });
      return;
    }

    if (!cursor.anchorId) {
      setTarget(resolveCursorTarget(containerRef.current, cursor) ?? { x: 0, y: 0, click: cursor.click });
      return;
    }

    let frame = 0;
    const initialTarget = resolveCursorTarget(containerRef.current, cursor);

    if (initialTarget) {
      setTarget(initialTarget);
    }

    const sync = () => {
      const next = resolveCursorTarget(containerRef.current, cursor);
      if (!next) {
        frame = requestAnimationFrame(sync);
        return;
      }

      setTarget((prev) => {
        const unchanged =
          Math.abs(prev.x - next.x) < 0.5 &&
          Math.abs(prev.y - next.y) < 0.5 &&
          prev.click === next.click;

        return unchanged ? prev : next;
      });
      frame = requestAnimationFrame(sync);
    };

    sync();

    return () => cancelAnimationFrame(frame);
  }, [
    containerRef,
    cursor,
    cursor?.align,
    cursor?.anchorId,
    cursor?.click,
    cursor?.offsetX,
    cursor?.offsetY,
    cursor?.x,
    cursor?.y,
  ]);

  return target;
}

function resolveCursorTarget(container: HTMLElement | null, cursor: StepCursor): CursorTarget | null {
  if (container && cursor.anchorId) {
    const element = container.querySelector<HTMLElement>(`[data-demo-anchor="${cursor.anchorId}"]`);

    if (element) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const align = ALIGN_POINTS[cursor.align ?? "center"];

      return {
        x: elementRect.left - containerRect.left + elementRect.width * align.x + (cursor.offsetX ?? 0),
        y: elementRect.top - containerRect.top + elementRect.height * align.y + (cursor.offsetY ?? 0),
        click: cursor.click,
      };
    }

    return null;
  }

  return {
    x: cursor.x ?? 0,
    y: cursor.y ?? 0,
    click: cursor.click,
  };
}
