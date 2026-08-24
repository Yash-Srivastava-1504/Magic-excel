import { useEffect, useState } from "react";

export type CursorTarget = {
  x: number;
  y: number;
  click?: boolean;
};

interface AnimatedCursorProps {
  target: CursorTarget;
  visible?: boolean;
}

export function AnimatedCursor({ target, visible = true }: AnimatedCursorProps) {
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    if (target.click) {
      setClicking(true);
      const t1 = setTimeout(() => setClicking(false), 400);
      return () => {
        clearTimeout(t1);
      };
    }
  }, [target.click, target.x, target.y]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <div
        className="absolute will-change-[left,top,transform] transition-[left,top,transform] duration-300 ease-out motion-reduce:transition-none"
        style={{
          left: target.x,
          top: target.y,
          transform: `translate(-2px, -2px) ${clicking ? "scale(0.85)" : "scale(1)"}`,
        }}
      >
        <svg width="22" height="28" viewBox="0 0 22 28" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
          <path
            d="M2 2 L2 21 L7 17 L10 24 L13 23 L10 16 L17 16 Z"
            fill="white"
            stroke="black"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
