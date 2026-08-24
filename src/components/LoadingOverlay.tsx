import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export default function LoadingOverlay({ visible, message = "Processing..." }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-300">
      <div className="flex flex-col items-center gap-3 bg-card border border-border rounded-2xl px-8 py-6 shadow-2xl">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
        <span className="text-xs font-mono text-muted-foreground animate-pulse">
          {message}
        </span>
      </div>
    </div>
  );
}
