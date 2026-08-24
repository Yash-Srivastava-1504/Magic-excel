import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Bot, User, Sparkles, Layers } from "lucide-react";
import type { ProcessingState, ExcelFile } from "@/lib/useSpreadsheet";
import type { ComputeResult } from "@/lib/operations";
import { useMention } from "@/hooks/useMention";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  computeResult?: ComputeResult;
  pipelineAdded?: boolean;
  opsCount?: number;
}

interface ChatPanelProps {
  columns: string[];
  processingState: ProcessingState;
  files: ExcelFile[];
  messages: ChatMessage[];
  onSubmit: (command: string) => void;
  onSwitchFile: (id: string) => void;
}

export default function ChatPanel({
  columns,
  processingState,
  files,
  messages,
  onSubmit,
  onSwitchFile,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputValueRef = useRef("");
  const lastCursorPosRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isProcessing = processingState === "processing";

  const mention = useMention({ columns, files });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isProcessing]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    inputValueRef.current = val;
    setInput(val);
    mention.handleMentionChange(val);
  }, [mention.handleMentionChange]);

  const handleSubmit = useCallback(() => {
    if (isProcessing) return;
    const val = inputValueRef.current.trim();
    if (!val) return;
    onSubmit(val);
    inputValueRef.current = "";
    setInput("");
  }, [isProcessing, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const consumed = mention.handleMentionKeyDown(
      e,
      inputValueRef.current,
      (newVal) => {
        inputValueRef.current = newVal;
        setInput(newVal);
        inputRef.current?.focus();
      },
      (file) => onSwitchFile(file.id),
    );
    if (consumed) return;

    if (e.key === "Enter" && !e.shiftKey && !isProcessing) {
      e.preventDefault();
      handleSubmit();
    }
  }, [mention.handleMentionKeyDown, isProcessing, handleSubmit, onSwitchFile]);

  // "/" shortcut to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        const el = document.activeElement;
        if (el?.tagName !== "INPUT" && el?.tagName !== "TEXTAREA") {
          e.preventDefault(); inputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Listen for Ctrl+Click column/cell tagging from DataGrid
  useEffect(() => {
    const handleAppend = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const token = customEvent.detail;
      const current = inputValueRef.current;
      const el = inputRef.current;
      const savedPos = lastCursorPosRef.current;

      if (savedPos !== null && savedPos <= current.length) {
        const before = current.slice(0, savedPos);
        const after = current.slice(savedPos);
        const prefixSpace = before.length > 0 && !before.endsWith(" ") ? " " : "";
        const suffixSpace = after.length > 0 && !after.startsWith(" ") ? " " : " ";
        const insertion = prefixSpace + token + suffixSpace;
        const newVal = before + insertion + after;
        const newCursorPos = before.length + insertion.length;

        inputValueRef.current = newVal;
        setInput(newVal);
        lastCursorPosRef.current = newCursorPos;

        if (el) {
          el.focus();
          requestAnimationFrame(() => { el.setSelectionRange(newCursorPos, newCursorPos); });
        }
      } else {
        const prefix = current.length > 0 && !current.endsWith(" ") ? " " : "";
        const newVal = current + prefix + token + " ";
        inputValueRef.current = newVal;
        setInput(newVal);
        lastCursorPosRef.current = newVal.length;
        el?.focus();
      }
    };

    window.addEventListener("append-command", handleAppend);
    return () => window.removeEventListener("append-command", handleAppend);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-auto px-3 py-3 space-y-3 scrollbar-thin min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary/60" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ask anything about your data</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1 leading-relaxed">
                Use <span className="font-mono text-primary/60">@column</span> to reference columns<br />
                Use <span className="font-mono text-primary/60">#file</span> to switch files<br />
                Press <span className="font-mono text-primary/60">/</span> to focus
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-2.5 w-2.5 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-secondary/60 border border-border/50 text-foreground rounded-tl-sm"
              }`}
            >
              {msg.computeResult && (
                <div className="mb-2 bg-background/40 rounded-lg px-3 py-2.5 text-center border border-border/30">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{msg.computeResult.label}</div>
                  <div className="font-mono text-lg font-bold text-primary">
                    {typeof msg.computeResult.value === "number"
                      ? msg.computeResult.value.toLocaleString(undefined, { maximumFractionDigits: 4 })
                      : msg.computeResult.value}
                  </div>
                  <div className="text-[9px] text-muted-foreground/50 font-mono mt-1">{msg.computeResult.expression}</div>
                </div>
              )}

              {msg.pipelineAdded && (
                <div className="flex items-center gap-1.5 mb-1.5 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20 text-[10px] font-mono">
                  <Layers className="h-2.5 w-2.5" />
                  {msg.opsCount && msg.opsCount > 1
                    ? `${msg.opsCount} operations added to pipeline`
                    : "Added to pipeline"}
                </div>
              )}

              <span className="font-mono whitespace-pre-wrap">{msg.content}</span>

              <div className={`text-[9px] mt-1 ${msg.role === "user" ? "text-primary-foreground/50" : "text-muted-foreground/40"}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            {msg.role === "user" && (
              <div className="w-5 h-5 rounded-full bg-foreground/10 border border-border/40 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-2.5 w-2.5 text-foreground/60" />
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="flex gap-2 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="h-2.5 w-2.5 text-primary rotate-0" />
            </div>
            <div className="bg-secondary/40 border border-border/30 rounded-xl rounded-tl-sm px-4 py-2.5 flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mr-1">Analyzing</span>
              <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1 h-1 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1 h-1 rounded-full bg-primary/60 animate-bounce"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border/50 p-3 bg-card/40">
        <div className="relative">
          {/* Mention dropdown */}
          {mention.showMention && mention.filteredItems.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-full max-w-[240px] rounded-lg border border-border bg-popover shadow-lg z-50">
              <div className="px-3 py-1.5 border-b border-border">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {mention.mentionType === "column" ? "Columns" : "Files"}
                </span>
              </div>
              <div className="max-h-40 overflow-auto scrollbar-thin">
                {mention.filteredItems.map((item, i) => {
                  const isFile = mention.mentionType === "file";
                  const label = isFile ? (item as ExcelFile).name : (item as string);
                  return (
                    <div
                      key={isFile ? (item as ExcelFile).id : (item as string)}
                      onClick={() => {
                        if (isFile) {
                          const file = item as ExcelFile;
                          onSwitchFile(file.id);
                          const newVal = mention.insertMention(file.name, "file", inputValueRef.current);
                          inputValueRef.current = newVal;
                          setInput(newVal);
                          inputRef.current?.focus();
                        } else {
                          const newVal = mention.insertMention(item as string, "column", inputValueRef.current);
                          inputValueRef.current = newVal;
                          setInput(newVal);
                          inputRef.current?.focus();
                        }
                      }}
                      className={`px-3 py-1.5 text-[11px] font-mono cursor-pointer transition-colors flex items-center gap-2 ${
                        i === mention.mentionIdx
                          ? "bg-accent text-accent-foreground"
                          : "text-popover-foreground hover:bg-accent/50"
                      }`}
                    >
                      <span className="text-muted-foreground">{isFile ? "#" : "@"}</span>
                      <span className="truncate">{label}</span>
                      {isFile && (
                        <span className="ml-auto text-muted-foreground text-[10px]">
                          {(item as ExcelFile).data.length} rows
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-end gap-2 bg-secondary/30 border border-border/50 rounded-xl px-3 py-2 focus-within:border-primary/40 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onSelect={() => { lastCursorPosRef.current = inputRef.current?.selectionStart ?? null; }}
              onBlur={() => { lastCursorPosRef.current = inputRef.current?.selectionStart ?? null; }}
              disabled={isProcessing}
              placeholder={isProcessing ? "Processing..." : "Ask about your data... (@ columns, # files)"}
              rows={1}
              className="flex-1 bg-transparent text-xs font-mono text-foreground placeholder:text-muted-foreground/50 outline-none disabled:opacity-50 resize-none max-h-20 min-h-[20px] leading-relaxed"
              style={{ height: "auto", overflowY: input.split("\n").length > 3 ? "auto" : "hidden" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 80) + "px";
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={isProcessing || !input.trim()}
              className={`shrink-0 p-1.5 rounded-lg transition-all ${
                input.trim() && !isProcessing
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "text-muted-foreground/30 cursor-not-allowed"
              }`}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
