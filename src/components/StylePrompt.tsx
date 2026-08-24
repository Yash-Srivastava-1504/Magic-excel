import { useState, useEffect } from "react";
import { Paintbrush, Type, X, ChevronRight, Check } from "lucide-react";
import COLORS from "@/utils/color.json";
import { type PipelineOperation } from "@/lib/pipelineEngine";

interface StylePromptProps {
  ops: PipelineOperation[];
  onResolve: (results: string[]) => void;
  onCancel: () => void;
}

const typedColors = COLORS as Record<string, Record<string, { hex: string; name: string }>>;

export default function StylePrompt({
  ops,
  onResolve,
  onCancel,
}: StylePromptProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [collected, setCollected] = useState<string[]>([]);
  
  // Local state for the current prompt's specific value (for real-time preview)
  const [currentValue, setCurrentValue] = useState<string>("");

  const currentOp = ops[currentIndex];
  if (!currentOp) return null;

  const prop = currentOp.payload.styleProp;
  const colName = currentOp.payload.column || "column";
  const isBg = prop === "bgcolor";
  const isColor = prop === "color";
  const isFontSize = prop === "fontsize";

  // Initialize currentValue if needed when currentIndex changes
  useEffect(() => {
    const existingVal = currentOp.payload.styleValue || "";
    // If it's #PROMPT# or empty, set a sensible default for the preview
    if (existingVal === "#PROMPT#" || existingVal === "") {
        if (isFontSize) setCurrentValue("12");
        else if (isBg) setCurrentValue("FFFF00"); // Yellow default for bg
        else if (isColor) setCurrentValue("000000"); // Black default for text
    } else {
        setCurrentValue(existingVal.replace("#", ""));
    }
  }, [currentIndex, prop]);

  const handleConfirm = (valueOverride?: string) => {
    const valToSave = valueOverride || currentValue;
    const updated = [...collected, valToSave];
    if (currentIndex === ops.length - 1) {
      onResolve(updated);
    } else {
      setCollected(updated);
      setCurrentIndex((i) => i + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-popover border border-border shadow-2xl rounded-2xl overflow-hidden max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isFontSize ? "bg-blue-500/10" : "bg-emerald-500/10"}`}>
                {isFontSize ? (
                    <Type className="h-4 w-4 text-blue-500" />
                ) : (
                    <Paintbrush className="h-4 w-4 text-emerald-400" />
                )}
            </div>
            <div>
                <h3 className="text-sm font-bold text-foreground">
                    {isFontSize ? "Adjust Font Size" : isBg ? "Pick Background" : "Pick Text Colour"}
                </h3>
                {ops.length > 1 && (
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        Step {currentIndex + 1} of {ops.length}
                    </p>
                )}
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-accent text-muted-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Sample Preview Cell */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Live Preview</p>
            <div className="h-20 w-full rounded-xl border border-sheet-grid bg-sheet-zebra flex items-center justify-center overflow-hidden shadow-inner bg-grid-slate-100/[0.03]">
              <div 
                className="px-4 py-2 rounded shadow-sm border border-black/5 transition-all duration-200 ease-out min-w-[120px] text-center"
                style={{ 
                    backgroundColor: isBg ? `#${currentValue}` : 'white',
                    color: isColor ? `#${currentValue}` : isBg ? 'black' : 'black',
                    fontSize: isFontSize ? `${currentValue}px` : '14px',
                    fontWeight: '500'
                }}
              >
                Sample Text
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center italic mt-1">Applying to <span className="text-foreground font-mono not-italic font-bold">@{colName}</span></p>
          </div>

          <div className="space-y-4">
            {isFontSize ? (
                <div className="space-y-4 py-2">
                    <div className="flex items-center gap-4">
                        <input 
                            type="range" 
                            min="8" 
                            max="72" 
                            value={currentValue} 
                            onChange={(e) => setCurrentValue(e.target.value)}
                            className="flex-1 accent-blue-500 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex items-center gap-1.5 bg-muted px-2 py-1.5 rounded-lg border border-border shadow-sm">
                           <input 
                             type="number"
                             value={currentValue}
                             onChange={(e) => setCurrentValue(e.target.value)}
                             className="w-8 text-xs bg-transparent border-none outline-none font-bold text-center appearance-none"
                           />
                           <span className="text-[10px] text-muted-foreground font-bold pr-1">PX</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {["12", "14", "16", "18", "24", "32"].map(sz => (
                            <button 
                                key={sz}
                                onClick={() => setCurrentValue(sz)}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all ${currentValue === sz ? "bg-blue-500 border-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-card border-border hover:border-blue-400 hover:text-blue-500"}`}
                            >
                                {sz}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="max-h-52 overflow-y-auto scrollbar-thin p-3 rounded-xl border border-border/50 bg-muted/20">
                    <div className="flex flex-col gap-2">
                        {Object.entries(typedColors).map(([colorName, shades]) => (
                            <div key={colorName} className="flex items-center gap-1.5">
                                {Object.values(shades).map((shade, i) => (
                                    <button
                                        key={i}
                                        className={`w-6 h-6 rounded-md border transition-all hover:scale-125 hover:z-10 hover:shadow-lg ${currentValue.toLowerCase() === shade.hex.replace("#", "").toLowerCase() ? "border-foreground scale-110 shadow-md ring-2 ring-foreground/20" : "border-border/30"}`}
                                        style={{ backgroundColor: shade.hex }}
                                        onClick={() => setCurrentValue(shade.hex.replace("#", ""))}
                                        title={`${colorName} - ${shade.name}`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-muted/20 border-t border-border/50 flex items-center justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => handleConfirm()}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${isFontSize ? "bg-blue-500 hover:bg-blue-600 shadow-blue-500/20" : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"}`}
          >
            {currentIndex === ops.length - 1 ? (
                <>Apply Style <Check className="h-3.5 w-3.5" /></>
            ) : (
                <>Next Step <ChevronRight className="h-3.5 w-3.5" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
