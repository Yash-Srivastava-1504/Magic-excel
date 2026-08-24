/**
 * Pipeline debug: each row is one layer — input, output, next consumer.
 * Console: one JSON line per layer. Dev: POST snapshot → pipeline-debug-latest.json.
 */

export interface PipelineLayerEntry {
  t: string;
  /** Logical stage name, e.g. detect_compute, name_agent, decompose, compile */
  layer: string;
  /** What this layer received (user text, planner text, command list, …). */
  input: string;
  /** What this layer produced (structured summary, not raw tables). */
  output: string;
  /** Where the output goes next (human-readable). */
  next: string;
}

export interface PipelineRunRecord {
  id: string;
  source: string;
  userInput: string;
  startedAt: string;
  endedAt?: string;
  status: "running" | "success" | "error" | "cancelled";
  layers: PipelineLayerEntry[];
  finalError?: string;
}

const MAX_RECENT = 25;
const DISK_RUN_CAP = 15;

const listeners = new Set<() => void>();
let activeRun: PipelineRunRecord | null = null;
const recentRuns: PipelineRunRecord[] = [];

let flushTimer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

export function serializePipelineError(e: unknown): string {
  if (e instanceof Error) {
    return e.stack ? `${e.message}\n${e.stack}` : e.message;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

/** Truncate for logs / JSON. */
export function previewText(s: string, max = 400): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function emitLayer(runId: string, row: PipelineLayerEntry) {
  console.info("[pipeline]", JSON.stringify({ runId, ...row }));
}

export function subscribePipelineRunLog(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getRecentPipelineRuns(): readonly PipelineRunRecord[] {
  return recentRuns;
}

export function getActivePipelineRun(): PipelineRunRecord | null {
  return activeRun;
}

/** Append one pipeline layer (input → output → next). No-op if no active run. */
export function logPipelineLayer(entry: {
  layer: string;
  input: string;
  output: string;
  next: string;
}): void {
  if (!activeRun) return;
  const row: PipelineLayerEntry = {
    t: new Date().toISOString(),
    layer: entry.layer,
    input: entry.input,
    output: entry.output,
    next: entry.next,
  };
  activeRun.layers.push(row);
  emitLayer(activeRun.id, row);
  notify();
  scheduleDiskFlush();
}

export function beginPipelineRun(opts: { source: string; userInput: string }): void {
  if (activeRun && activeRun.status === "running") {
    activeRun.status = "cancelled";
    activeRun.endedAt = new Date().toISOString();
    const t = new Date().toISOString();
    activeRun.layers.push({
      t,
      layer: "run",
      input: activeRun.id,
      output: "Superseded: a new pipeline started before this one finished.",
      next: "(none)",
    });
    recentRuns.unshift(activeRun);
    while (recentRuns.length > MAX_RECENT) recentRuns.pop();
    notify();
    void postSnapshotToDevServer();
  }

  const id = `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  activeRun = {
    id,
    source: opts.source,
    userInput: opts.userInput,
    startedAt: new Date().toISOString(),
    status: "running",
    layers: [],
  };

  logPipelineLayer({
    layer: "entry",
    input: previewText(opts.userInput, 600),
    output: `runId=${id} | source=${opts.source}`,
    next: "detect_compute",
  });
}

export function endPipelineRun(outcome: {
  status: "success" | "error" | "cancelled";
  error?: unknown;
  summary?: Record<string, unknown>;
}): void {
  if (!activeRun) return;

  const endedAt = new Date().toISOString();
  activeRun.endedAt = endedAt;
  activeRun.status = outcome.status;

  if (outcome.error) {
    activeRun.finalError = serializePipelineError(outcome.error);
    logPipelineLayer({
      layer: "error",
      input: "exception",
      output: previewText(activeRun.finalError, 1500),
      next: "(none)",
    });
  }

  if (outcome.summary && Object.keys(outcome.summary).length > 0) {
    logPipelineLayer({
      layer: "outcome",
      input: "run_summary",
      output: previewText(JSON.stringify(outcome.summary), 800),
      next: "(none)",
    });
  }

  const finished = activeRun;
  activeRun = null;
  recentRuns.unshift(finished);
  while (recentRuns.length > MAX_RECENT) recentRuns.pop();
  notify();
  scheduleDiskFlush(true);
}

function scheduleDiskFlush(force = false) {
  if (!import.meta.env.DEV) return;

  const send = () => {
    flushTimer = null;
    void postSnapshotToDevServer();
  };

  if (force) {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = null;
    send();
    return;
  }

  if (flushTimer) return;
  flushTimer = setTimeout(send, 400);
}

function simplifyRunForDisk(r: PipelineRunRecord): Record<string, unknown> {
  return {
    id: r.id,
    source: r.source,
    userInput: r.userInput,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    status: r.status,
    ...(r.finalError ? { finalError: r.finalError } : {}),
    layers: r.layers.map(({ t, layer, input, output, next }) => ({
      t,
      layer,
      input,
      output,
      next,
    })),
  };
}

async function postSnapshotToDevServer(): Promise<void> {
  if (!import.meta.env.DEV) return;
  const payload = {
    updatedAt: new Date().toISOString(),
    runs: recentRuns.slice(0, DISK_RUN_CAP).map(simplifyRunForDisk),
  };
  try {
    const res = await fetch("/__pipeline_debug/snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn("[pipeline] debug file write failed:", res.status, await res.text().catch(() => ""));
    }
  } catch {
    /* dev server down */
  }
}

export function exportPipelineRunsJson(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      runs: recentRuns.map(simplifyRunForDisk),
    },
    null,
    2,
  );
}
