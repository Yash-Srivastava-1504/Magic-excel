import { useMemo, useRef } from "react";
import { AnimatedCursor } from "./AnimatedCursor";
import { useAnchoredCursor } from "./useAnchoredCursor";
import { useDemoSequence, type Step } from "./useDemoSequence";
import { Sparkles, Send, GitBranch, Save, Play, Bot, User, FileSpreadsheet } from "lucide-react";

interface Props {
  active?: boolean;
}

type Row = { id: number; product: string; region: string; revenue: number; units: number };

const initialData: Row[] = [
  { id: 1, product: "Aurora Pro", region: "NA", revenue: 78, units: 142 },
  { id: 2, product: "Nimbus Lite", region: "EU", revenue: 42, units: 98 },
  { id: 3, product: "Vertex X", region: "APAC", revenue: 91, units: 210 },
  { id: 4, product: "Helix Mini", region: "NA", revenue: 33, units: 67 },
  { id: 5, product: "Quasar", region: "EU", revenue: 64, units: 121 },
  { id: 6, product: "Pulse 2", region: "LATAM", revenue: 58, units: 88 },
  { id: 7, product: "Orbit Max", region: "NA", revenue: 72, units: 155 },
];

type Operation = { id: string; label: string; query: string; type: "filter" | "mutate" };

export function TalkToExlDemo({ active = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const steps: Step[] = useMemo(() => [
    { duration: 700, cursor: { x: 500, y: 80 }, state: { phase: "idle" } },
    { duration: 1700, cursor: { anchorId: "sheet-chat-input", align: "center", offsetX: -20 }, state: { phase: "typing1", typed: "show me where @revenue is more than 50" } },
    { duration: 700, cursor: { anchorId: "sheet-send-button", align: "center", click: true }, state: { phase: "send1", typed: "show me where @revenue is more than 50" } },
    { duration: 1900, cursor: { anchorId: "revenue-cell-0", align: "center" }, state: { phase: "filtered" } },
    { duration: 1700, cursor: { anchorId: "sheet-chat-input", align: "center", offsetX: -12 }, state: { phase: "typing2", typed: "set @revenue to 30 if @revenue > 55" } },
    { duration: 700, cursor: { anchorId: "sheet-send-button", align: "center", click: true }, state: { phase: "send2", typed: "set @revenue to 30 if @revenue > 55" } },
    { duration: 2100, cursor: { anchorId: "revenue-cell-0", align: "center" }, state: { phase: "mutated" } },
    { duration: 1300, cursor: { anchorId: "save-pipeline-button", align: "center" }, state: { phase: "mutated" } },
    { duration: 1100, cursor: { anchorId: "save-pipeline-button", align: "center", click: true }, state: { phase: "saved" } },
    { duration: 1800, cursor: { anchorId: "save-pipeline-button", align: "center" }, state: { phase: "saved" } },
  ], []);

  const { step } = useDemoSequence(steps, true, active);
  const cursorTarget = useAnchoredCursor(containerRef, step?.cursor);
  const s = step?.state as { phase: string; typed?: string } | undefined;
  const phase = s?.phase ?? "idle";

  const filtered = ["filtered", "typing2", "send2", "mutated", "saved"].includes(phase);
  const mutated = ["mutated", "saved"].includes(phase);
  const saved = phase === "saved";

  const data = mutated
    ? initialData.map((r) => (r.revenue > 55 ? { ...r, revenue: 30 } : r))
    : initialData;

  const operations: Operation[] = [
    ...(filtered ? [{ id: "op1", label: "Filter rows", query: "revenue > 50", type: "filter" as const }] : []),
    ...(mutated ? [{ id: "op2", label: "Set revenue", query: "revenue = 30 if > 55", type: "mutate" as const }] : []),
  ];

  const messages = buildMessages(phase);
  const inputText =
    (phase === "typing1" || phase === "send1") ? s?.typed
    : (phase === "typing2" || phase === "send2") ? s?.typed
    : "";

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)]">
      <BrowserChrome />

      <div ref={containerRef} className="relative grid h-[calc(100%-44px)] grid-cols-[200px_1fr_340px]">
        {/* Pipeline panel */}
        <aside className="border-r border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 px-1 pb-3">
            <GitBranch className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pipeline</span>
          </div>

          {operations.length === 0 ? (
            <p className="px-1 text-xs text-muted-foreground">No steps yet. Ask the assistant to filter or change cells.</p>
          ) : (
            <div className="space-y-2">
              {operations.map((op, i) => (
                <div key={op.id} className="rounded-lg border border-border bg-card p-2.5 shadow-[var(--shadow-soft)] animate-fade-up">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[9px] text-primary">{i + 1}</span>
                    {op.type}
                  </div>
                  <p className="mt-1 text-xs font-medium">{op.label}</p>
                  <code className="mt-0.5 block truncate text-[10px] text-muted-foreground">{op.query}</code>
                </div>
              ))}
            </div>
          )}

          {operations.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <button data-demo-anchor="save-pipeline-button" className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${saved ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
                <Save className="h-3 w-3" />
                {saved ? "Saved as workflow" : "Save pipeline"}
              </button>
              <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground/80">
                <Play className="h-3 w-3" /> Replay
              </button>
            </div>
          )}

          {saved && (
            <div className="mt-3 rounded-lg border border-success/30 bg-success/10 p-2 text-[10px] text-foreground animate-fade-up">
              ✓ Saved. Re-run on any new sheet.
            </div>
          )}
        </aside>

        {/* Sheet */}
        <section className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-[var(--color-excel-header)] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Q3_sales.xlsx</span>
              <span className="text-[10px] text-muted-foreground">— Sheet1</span>
            </div>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Preview mode</span>
          </div>

          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-excel-grid)] bg-[var(--color-excel-header)] text-xs text-muted-foreground">
                  <th className="w-10 px-2 py-1.5 font-normal" />
                  <SheetHeader>A · product</SheetHeader>
                  <SheetHeader>B · region</SheetHeader>
                  <SheetHeader>C · revenue</SheetHeader>
                  <SheetHeader>D · units</SheetHeader>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  const initialRev = initialData[i].revenue;
                  const isFiltered = filtered && initialRev > 50;
                  const wasMutated = mutated && initialRev > 55;
                  return (
                    <tr key={row.id} className="border-b border-[var(--color-excel-grid)]/70">
                      <td className="bg-[var(--color-excel-header)] px-2 py-2 text-center text-[10px] text-muted-foreground border-r border-[var(--color-excel-grid)]">{i + 1}</td>
                      <td className={`px-3 py-2 border-r border-[var(--color-excel-grid)]/70 ${isFiltered ? "bg-sheet-highlight/60" : ""}`}>{row.product}</td>
                      <td className={`px-3 py-2 border-r border-[var(--color-excel-grid)]/70 ${isFiltered ? "bg-sheet-highlight/60" : ""}`}>{row.region}</td>
                      <td data-demo-anchor={i === 0 ? "revenue-cell-0" : undefined} className={`px-3 py-2 font-mono border-r border-[var(--color-excel-grid)]/70 ${wasMutated ? "bg-sheet-changed/70 font-semibold animate-cell-flash" : isFiltered ? "bg-sheet-highlight/60" : ""}`}>
                        ${row.revenue}k
                      </td>
                      <td className={`px-3 py-2 ${isFiltered ? "bg-sheet-highlight/60" : ""}`}>{row.units}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered && !mutated && (
            <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs animate-fade-up">
              <Sparkles className="h-3.5 w-3.5 text-warning-foreground" />
              <span><strong>5 rows</strong> match <code className="text-[11px]">revenue &gt; 50</code></span>
            </div>
          )}
          {mutated && (
            <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-1.5 text-xs animate-fade-up">
              <Sparkles className="h-3.5 w-3.5 text-success" />
              <span><strong>5 cells updated</strong> in column C</span>
            </div>
          )}
        </section>

        {/* Chatbot */}
        <aside className="flex flex-col border-l border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-sm font-semibold">talktoexl assistant</p>
              <p className="text-[10px] text-muted-foreground">Ask in plain English</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-hidden p-3">
            {messages.map((m, i) => (
              <ChatMessage key={i} role={m.role}>{m.text}</ChatMessage>
            ))}
          </div>

          <div className="border-t border-border p-2.5">
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 py-1.5">
              <input
                data-demo-anchor="sheet-chat-input"
                value={inputText ?? ""}
                readOnly
                placeholder="Ask anything about your sheet…"
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
              <button data-demo-anchor="sheet-send-button" className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${(phase === "send1" || phase === "send2") ? "bg-primary scale-95" : "bg-primary/90"} text-primary-foreground`}>
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {["@revenue", "@region", "@units"].map((c) => (
                <span key={c} className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">{c}</span>
              ))}
            </div>
          </div>
        </aside>

        <AnimatedCursor target={cursorTarget} />
      </div>
    </div>
  );
}

function buildMessages(phase: string): { role: "bot" | "user"; text: React.ReactNode }[] {
  const list: { role: "bot" | "user"; text: React.ReactNode }[] = [
    { role: "bot", text: "Hi! Ask me anything — use @column to reference fields." },
  ];
  if (["typing1", "send1", "filtered", "typing2", "send2", "mutated", "saved"].includes(phase)) {
    list.push({ role: "user", text: "show me where @revenue is more than 50" });
  }
  if (["filtered", "typing2", "send2", "mutated", "saved"].includes(phase)) {
    list.push({ role: "bot", text: <>Highlighted <strong>5 rows</strong> matching <code className="text-[10px]">revenue &gt; 50</code>.</> });
  }
  if (["mutated", "saved"].includes(phase)) {
    list.push({ role: "user", text: "set @revenue to 30 if @revenue > 55" });
    list.push({ role: "bot", text: <>Updated <strong>5 cells</strong>. Step added to your pipeline.</> });
  }
  if (phase === "saved") {
    list.push({ role: "bot", text: "Pipeline saved — replay any time on new data." });
  }
  return list;
}

function ChatMessage({ role, children }: { role: "bot" | "user"; children: React.ReactNode }) {
  const isBot = role === "bot";
  return (
    <div className={`flex animate-fade-up gap-2 ${isBot ? "" : "flex-row-reverse"}`}>
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isBot ? "bg-primary/10 text-primary" : "bg-muted text-foreground/70"}`}>
        {isBot ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3 w-3" />}
      </div>
      <div className={`max-w-[80%] rounded-xl px-2.5 py-1.5 text-xs leading-snug ${isBot ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}>
        {children}
      </div>
    </div>
  );
}

function SheetHeader({ children }: { children: React.ReactNode }) {
  return <th className="border-l border-[var(--color-excel-grid)] px-3 py-1.5 text-left font-mono text-[10px] uppercase tracking-wide">{children}</th>;
}

function BrowserChrome() {
  return (
    <div className="flex h-11 items-center gap-2 border-b border-border bg-muted/40 px-4">
      <span className="h-3 w-3 rounded-full bg-destructive/70" />
      <span className="h-3 w-3 rounded-full bg-warning/80" />
      <span className="h-3 w-3 rounded-full bg-success/70" />
      <div className="ml-4 flex h-7 flex-1 items-center justify-center rounded-md bg-background px-3 text-xs text-muted-foreground">
        talktoexl.app / Q3_sales.xlsx
      </div>
    </div>
  );
}
