import { useEffect, useRef, useState } from "react";

export type StepCursor = {
  x?: number;
  y?: number;
  click?: boolean;
  anchorId?: string;
  align?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  offsetX?: number;
  offsetY?: number;
};

export type Step = {
  duration: number;
  cursor?: StepCursor;
  state?: Record<string, unknown>;
};

export function useDemoSequence(steps: Step[], loop = true, active = true) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const step = steps[index];
    if (!step) return;
    timerRef.current = setTimeout(() => {
      setIndex((i) => {
        const next = i + 1;
        if (next >= steps.length) return loop ? 0 : i;
        return next;
      });
    }, step.duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, steps, loop, active]);

  useEffect(() => {
    if (active) setIndex(0);
  }, [active]);

  return { index, step: steps[index], reset: () => setIndex(0) };
}
