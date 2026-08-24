import { useCallback, useEffect, useState } from "react";
import { exportPipelineRunsJson, subscribePipelineRunLog } from "@/lib/pipelineRunLogger";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bug, Copy, Download } from "lucide-react";

interface PipelineDebugPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PipelineDebugPanel({
  open,
  onOpenChange,
}: PipelineDebugPanelProps) {
  const [, tick] = useState(0);
  useEffect(() => subscribePipelineRunLog(() => tick((n) => n + 1)), []);

  void tick;
  const json = exportPipelineRunsJson();

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      /* ignore */
    }
  }, [json]);

  const download = useCallback(() => {
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pipeline-runs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [json]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col gap-3">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Pipeline debug log
          </SheetTitle>
          <SheetDescription>
            Each row is one layer: <strong>input</strong> → <strong>output</strong> →{" "}
            <strong>next</strong> (where the data goes). Console still prints one JSON line per
            layer as <code className="text-xs">[pipeline]</code>. In dev, snapshots go to{" "}
            <code className="text-xs">pipeline-debug-latest.json</code>.
          </SheetDescription>
        </SheetHeader>
        <div className="flex gap-2 shrink-0">
          <Button type="button" variant="secondary" size="sm" onClick={() => void copy()}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy JSON
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={download}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download
          </Button>
        </div>
        <ScrollArea className="flex-1 min-h-0 rounded-md border border-border bg-muted/30">
          <pre className="p-3 text-[10px] leading-relaxed font-mono whitespace-pre-wrap break-words">
            {json}
          </pre>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
