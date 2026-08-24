import { useState, useRef, useCallback, useEffect } from "react";
import COLORS from "@/utils/color.json";
import ReactDOM from "react-dom";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  Paintbrush, Type,
  MoreHorizontal, Undo2, Redo2,
  Minus, Plus, ChevronDown,
  Sun, Moon, LogOut, Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useTheme } from "next-themes";
import {
  type CellStyleMap,
  type CellStyle,
  cellKey,
  toggleFontProp,
  applyStylePatch,
} from "@/lib/cellStyles";

export interface SelectedRange {
  cells: { rowIndex: number; col: string }[];
}

interface MenuBarProps {
  fileName: string;
  onUndo: () => void;
  undoEnabled: boolean;
  username: string;
  onLogout: () => void;
  cellStyles: CellStyleMap;
  onStyleChange: (newStyles: CellStyleMap) => void;
  selectedRange: SelectedRange | null;
  /** Open pipeline / LLM JSON debug log in the UI. */
  onOpenPipelineLog?: () => void;
}

const ToolbarDivider = () => <div className="w-px h-5 bg-toolbar-border mx-0.5 shrink-0" />;

const ToolbarButton = ({
  children, title, onClick, disabled, active,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) => (
  <Button
    variant="ghost"
    size="icon"
    className={`h-7 w-7 rounded-sm shrink-0 ${active ? "bg-accent text-accent-foreground" : ""}`}
    title={title}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </Button>
);

/* ─── Fixed-position portal dropdown ─── */
function FixedDropdown({
  anchorRef,
  onClose,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 2, left: rect.left });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  if (!pos) return null;

  return ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
    >
      {children}
    </div>,
    document.body,
  );
}

/* ─── Colour palette derived from color.json ─── */
const typedColors = COLORS as Record<string, Record<string, { hex: string; name: string }>>;

function ColorPickerContent({ onSelect, onClose }: { onSelect: (hex: string) => void; onClose: () => void }) {
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl p-2.5 w-[240px] max-h-[340px] overflow-y-auto scrollbar-thin">
      <div className="flex flex-col gap-1">
        {Object.entries(typedColors).map(([colorName, shades]) => (
          <div key={colorName} className="flex items-center gap-0.5">
            {Object.values(shades).map((shade, i) => (
              <button
                key={i}
                className="w-[18px] h-[18px] rounded-sm border border-border/30 hover:scale-125 hover:border-foreground transition-transform shrink-0"
                style={{ backgroundColor: shade.hex }}
                onClick={() => { onSelect(shade.hex.replace("#", "")); onClose(); }}
                title={`${colorName} ${shade.name} — ${shade.hex}`}
              />
            ))}
          </div>
        ))}
      </div>
      <button
        onClick={() => { onSelect(""); onClose(); }}
        className="mt-2 text-[10px] text-muted-foreground hover:text-foreground w-full text-center"
      >
        Remove colour
      </button>
    </div>
  );
}

/* ─── Font size ─── */
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72];

function FontSizeContent({ value, onSelect, onClose }: { value: number; onSelect: (s: number) => void; onClose: () => void }) {
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl py-1 w-16 max-h-48 overflow-y-auto scrollbar-thin">
      {FONT_SIZES.map((s) => (
        <button
          key={s}
          onClick={() => { onSelect(s); onClose(); }}
          className={`w-full px-2 py-1 text-xs text-left hover:bg-accent transition-colors ${s === value ? "bg-accent font-medium" : ""}`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/* ─── Font family ─── */
const FONTS = ["Arial", "Calibri", "Courier New", "Georgia", "Helvetica", "Inter", "Roboto", "Times New Roman", "Verdana"];

function FontFamilyContent({ value, onSelect, onClose }: { value: string; onSelect: (f: string) => void; onClose: () => void }) {
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl py-1 w-40 max-h-52 overflow-y-auto scrollbar-thin">
      {FONTS.map((f) => (
        <button
          key={f}
          onClick={() => { onSelect(f); onClose(); }}
          className={`w-full px-3 py-1.5 text-xs text-left hover:bg-accent transition-colors ${f === value ? "bg-accent font-medium" : ""}`}
          style={{ fontFamily: f }}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

/* ═════════ Main Component ═════════ */
export default function ExcelMenuBar({
  fileName, onUndo, undoEnabled,
  username, onLogout,
  cellStyles, onStyleChange, selectedRange,
  onOpenPipelineLog,
}: MenuBarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [openPicker, setOpenPicker] = useState<"textColor" | "fillColor" | "fontSize" | "fontFamily" | null>(null);

  // Refs for each anchor button so we can position the portal dropdown
  const textColorRef = useRef<HTMLDivElement>(null);
  const fillColorRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const fontFamilyRef = useRef<HTMLDivElement>(null);

  const hasSel = selectedRange && selectedRange.cells.length > 0;

  const firstCellStyle: CellStyle = hasSel
    ? cellStyles.get(cellKey(selectedRange.cells[0].rowIndex, selectedRange.cells[0].col)) ?? {}
    : {};

  const currentFontSize = firstCellStyle.font?.size ?? 11;
  const currentFontFamily = firstCellStyle.font?.name ?? "Arial";

  const doToggle = useCallback(
    (prop: "bold" | "italic" | "underline" | "strikethrough") => {
      if (!hasSel) return;
      onStyleChange(toggleFontProp(cellStyles, selectedRange.cells, prop));
    },
    [hasSel, cellStyles, selectedRange, onStyleChange],
  );

  const setAlignment = useCallback(
    (h: "left" | "center" | "right") => {
      if (!hasSel) return;
      onStyleChange(applyStylePatch(cellStyles, selectedRange.cells, { alignment: { horizontal: h } }));
    },
    [hasSel, cellStyles, selectedRange, onStyleChange],
  );

  const setFontSize = useCallback(
    (size: number) => {
      if (!hasSel) return;
      onStyleChange(applyStylePatch(cellStyles, selectedRange.cells, { font: { size } }));
    },
    [hasSel, cellStyles, selectedRange, onStyleChange],
  );

  const adjustFontSize = useCallback(
    (delta: number) => {
      if (!hasSel) return;
      const cur = currentFontSize;
      const next = Math.max(6, Math.min(72, cur + delta));
      onStyleChange(applyStylePatch(cellStyles, selectedRange.cells, { font: { size: next } }));
    },
    [hasSel, currentFontSize, cellStyles, selectedRange, onStyleChange],
  );

  const setFontFamily = useCallback(
    (name: string) => {
      if (!hasSel) return;
      onStyleChange(applyStylePatch(cellStyles, selectedRange.cells, { font: { name } }));
    },
    [hasSel, cellStyles, selectedRange, onStyleChange],
  );

  const setTextColor = useCallback(
    (hex: string) => {
      if (!hasSel) return;
      onStyleChange(applyStylePatch(cellStyles, selectedRange.cells, { font: { color: hex || undefined } }));
    },
    [hasSel, cellStyles, selectedRange, onStyleChange],
  );

  const setFillColor = useCallback(
    (hex: string) => {
      if (!hasSel) return;
      onStyleChange(applyStylePatch(cellStyles, selectedRange.cells, { fill: { bgColor: hex || undefined } }));
    },
    [hasSel, cellStyles, selectedRange, onStyleChange],
  );

  const closePicker = useCallback(() => setOpenPicker(null), []);
  const togglePicker = (p: typeof openPicker) => setOpenPicker((prev) => prev === p ? null : p);

  return (
    <div className="flex flex-col border-b border-toolbar-border">
      {/* Title bar */}
      <div className="flex items-center h-8 px-3 bg-menubar-bg border-b border-toolbar-border">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
            <span className="text-primary-foreground text-[10px] font-bold">DS</span>
          </div>
          <span className="text-sm font-medium">{fileName}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] font-mono text-muted-foreground/60">
            <span className="text-primary/80 font-semibold">{username}</span>
          </span>
          {onOpenPipelineLog && (
            <button
              type="button"
              onClick={onOpenPipelineLog}
              title="Pipeline debug log (JSON)"
              className="flex items-center justify-center h-7 w-7 rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Bug className="h-3.5 w-3.5" />
            </button>
          )}
          <Toggle
            pressed={resolvedTheme === "dark"}
            onPressedChange={(pressed: boolean) => setTheme(pressed ? "dark" : "light")}
            aria-label="Toggle theme"
            className="h-7 w-7"
            title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolvedTheme === "dark" ? <Moon className="h-3.5 w-3.5 text-muted-foreground/80" /> : <Sun className="h-3.5 w-3.5 text-muted-foreground/80" />}
          </Toggle>
          <button
            onClick={onLogout}
            title="Sign out"
            className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
          >
            <LogOut className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Formatting Toolbar — NO overflow hidden/auto so nothing clips inside,
          but we use portals for dropdowns anyway so we only need horizontal scroll */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-toolbar-bg">
        <ToolbarButton title="Undo (Ctrl+Z)" onClick={onUndo} disabled={!undoEnabled}><Undo2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Redo" disabled><Redo2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarDivider />

        {/* Font family */}
        <div ref={fontFamilyRef} className="shrink-0">
          <button
            className="h-7 px-2 text-xs rounded-sm hover:bg-accent flex items-center gap-1 min-w-[80px] transition-colors"
            onClick={() => togglePicker("fontFamily")}
            style={{ fontFamily: currentFontFamily }}
          >
            {currentFontFamily} <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
        {openPicker === "fontFamily" && (
          <FixedDropdown anchorRef={fontFamilyRef} onClose={closePicker}>
            <FontFamilyContent value={currentFontFamily} onSelect={setFontFamily} onClose={closePicker} />
          </FixedDropdown>
        )}

        {/* Font size */}
        <div ref={fontSizeRef} className="flex items-center border border-border rounded-sm shrink-0">
          <button className="h-6 w-6 flex items-center justify-center hover:bg-accent" onClick={() => adjustFontSize(-1)}>
            <Minus className="h-3 w-3" />
          </button>
          <button
            className="text-xs w-7 text-center border-x border-border hover:bg-accent/50"
            onClick={() => togglePicker("fontSize")}
          >
            {currentFontSize}
          </button>
          <button className="h-6 w-6 flex items-center justify-center hover:bg-accent" onClick={() => adjustFontSize(1)}>
            <Plus className="h-3 w-3" />
          </button>
        </div>
        {openPicker === "fontSize" && (
          <FixedDropdown anchorRef={fontSizeRef} onClose={closePicker}>
            <FontSizeContent value={currentFontSize} onSelect={setFontSize} onClose={closePicker} />
          </FixedDropdown>
        )}
        <ToolbarDivider />

        {/* Bold / Italic / Underline / Strike */}
        <ToolbarButton title="Bold (Ctrl+B)" active={!!firstCellStyle.font?.bold} onClick={() => doToggle("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Italic (Ctrl+I)" active={!!firstCellStyle.font?.italic} onClick={() => doToggle("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Underline (Ctrl+U)" active={!!firstCellStyle.font?.underline} onClick={() => doToggle("underline")}>
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" active={!!firstCellStyle.font?.strikethrough} onClick={() => doToggle("strikethrough")}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        {/* Text colour */}
        <div ref={textColorRef} className="shrink-0">
          <ToolbarButton title="Text colour" onClick={() => togglePicker("textColor")}>
            <div className="flex flex-col items-center">
              <Type className="h-3.5 w-3.5" />
              <div className="w-3.5 h-[3px] rounded-full mt-[1px]" style={{ backgroundColor: firstCellStyle.font?.color ? `#${firstCellStyle.font.color}` : "currentColor" }} />
            </div>
          </ToolbarButton>
        </div>
        {openPicker === "textColor" && (
          <FixedDropdown anchorRef={textColorRef} onClose={closePicker}>
            <ColorPickerContent onSelect={setTextColor} onClose={closePicker} />
          </FixedDropdown>
        )}
        <ToolbarDivider />

        {/* Fill colour */}
        <div ref={fillColorRef} className="shrink-0">
          <ToolbarButton title="Fill colour" onClick={() => togglePicker("fillColor")}>
            <div className="flex flex-col items-center">
              <Paintbrush className="h-3.5 w-3.5" />
              <div className="w-3.5 h-[3px] rounded-full mt-[1px]" style={{ backgroundColor: firstCellStyle.fill?.bgColor ? `#${firstCellStyle.fill.bgColor}` : "currentColor" }} />
            </div>
          </ToolbarButton>
        </div>
        {openPicker === "fillColor" && (
          <FixedDropdown anchorRef={fillColorRef} onClose={closePicker}>
            <ColorPickerContent onSelect={setFillColor} onClose={closePicker} />
          </FixedDropdown>
        )}
        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton title="Align left" active={firstCellStyle.alignment?.horizontal === "left"} onClick={() => setAlignment("left")}>
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Align centre" active={firstCellStyle.alignment?.horizontal === "center"} onClick={() => setAlignment("center")}>
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Align right" active={firstCellStyle.alignment?.horizontal === "right"} onClick={() => setAlignment("right")}>
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarDivider />

        <ToolbarButton title="More formatting options"><MoreHorizontal className="h-4 w-4" /></ToolbarButton>
      </div>
    </div>
  );
}
