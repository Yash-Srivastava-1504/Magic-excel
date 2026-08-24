import { useState, useRef, useEffect } from "react";
import { Loader2, Eye, EyeOff, X, Minus, Square } from "lucide-react";

interface LoginScreenProps {
  onLogin: (username: string, passcode: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export default function LoginScreen({ onLogin, loading, error }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [shake, setShake] = useState(false);
  const [activeCell, setActiveCell] = useState<string>("B2");

  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { usernameRef.current?.focus(); setActiveCell("B2"); }, []);

  useEffect(() => {
    if (error) {
      setShake(true);
      setActiveCell("D3");
      const t = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(t);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !passcode.trim() || loading) return;
    await onLogin(username.trim(), passcode);
  };

  const getCellClass = (id: string, isInput = false) => {
    const isActive = activeCell === id;
    return `
      relative border-b border-r border-border/50 px-3 flex items-center font-mono text-xs h-full w-full
      ${isActive ? "z-10 bg-emerald-500/5 ring-[1.5px] ring-emerald-600 ring-inset" : ""}
      ${isInput ? "p-0 cursor-text hover:bg-emerald-500/5 transition-colors" : "bg-background text-muted-foreground select-none"}
    `;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f2f1] p-4 sm:p-8 select-none">
      {/* Background layer */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: "60px 24px",
        }}
      />

      {/* Container echoing an Excel App Window */}
      <div 
        className={`
          flex flex-col w-full max-w-4xl bg-background rounded-md border border-border shadow-2xl overflow-hidden relative z-10
          ${shake ? "animate-[shake_0.45s_ease-in-out]" : ""}
        `}
        style={{ animation: shake ? "shake 0.45s ease-in-out" : undefined }}
      >
        {/* Title Bar - Excel Green */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#107C41] text-white">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-white/20 rounded-sm flex items-center justify-center font-bold text-[10px] select-none shadow-[inset_0_1px_rgba(255,255,255,0.2)]">
              X
            </div>
            <span className="text-xs font-semibold tracking-wide font-sans">talktoExl - Login.xlsx</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/90">
            <button type="button" tabIndex={-1} className="hover:bg-white/20 p-1.5 rounded-sm transition-colors"><Minus className="w-3.5 h-3.5" /></button>
            <button type="button" tabIndex={-1} className="hover:bg-white/20 p-1.5 rounded-sm transition-colors"><Square className="w-3.5 h-3.5" /></button>
            <button type="button" tabIndex={-1} className="hover:bg-[#E81123] hover:text-white p-1.5 rounded-sm transition-colors"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {/* Fake Ribbon */}
        <div className="flex flex-col border-b border-border bg-[#F3F2F1] dark:bg-card">
          <div className="flex text-[11px] px-2 pt-1 font-sans text-muted-foreground tracking-wide">
            {["File", "Home", "Insert", "Page Layout", "Formulas", "Data", "Review", "View"].map(tab => (
              <div key={tab} className={`px-4 py-1.5 cursor-default ${tab === "Home" ? "text-[#107C41] dark:text-emerald-400 font-semibold border-b-2 border-[#107C41] bg-background" : "hover:bg-muted/50"}`}>
                {tab}
              </div>
            ))}
          </div>
          
          <div className="flex items-center px-4 py-2 gap-4 border-t border-border/50 text-muted-foreground bg-background">
            {/* Quick fake ribbon tools */}
            <div className="flex gap-1 items-center">
              <div className="w-7 h-7 hover:bg-muted rounded text-foreground cursor-default flex items-center justify-center font-serif font-bold text-sm bg-muted/50 border border-border">B</div>
              <div className="w-7 h-7 hover:bg-muted rounded text-foreground cursor-default flex items-center justify-center font-serif italic text-sm">I</div>
              <div className="w-7 h-7 hover:bg-muted rounded text-foreground cursor-default flex items-center justify-center font-serif underline text-sm border-b border-muted">U</div>
            </div>
            <div className="w-px h-6 bg-border/80" />
            <div className="flex gap-1.5">
              <div className="text-[11px] font-sans text-foreground bg-background border border-border px-3 py-1 rounded-sm shadow-sm flex items-center gap-6 cursor-default">
                <span>Arial</span>
                <span className="text-[8px] opacity-60">▼</span>
              </div>
              <div className="text-[11px] font-sans text-foreground bg-background border border-border px-3 py-1 rounded-sm shadow-sm flex items-center gap-3 cursor-default">
                <span>11</span>
                <span className="text-[8px] opacity-60">▼</span>
              </div>
            </div>
            <div className="w-px h-6 bg-border/80" />
            <div className="flex items-center gap-2 font-sans font-medium text-xs px-2 cursor-pointer hover:bg-emerald-500/10 text-[#107C41] dark:text-emerald-400 rounded py-1 transition-colors">
              <div className="flex border border-current rounded-sm shadow-sm overflow-hidden">
                <div className="w-1.5 h-3 bg-current" />
                <div className="w-3 h-3 bg-background" />
              </div>
              Analyze Data
            </div>
          </div>
        </div>

        {/* Formula Bar */}
        <div className="flex items-stretch border-b border-border bg-background shadow-sm z-10 font-sans text-sm text-foreground">
          <div className="w-12 flex items-center justify-center border-r border-border font-medium bg-muted/10 text-muted-foreground">
            {activeCell}
          </div>
          <div className="flex-1 flex items-stretch border-r border-border overflow-hidden bg-background">
            <div className="px-3 flex items-center justify-center border-r border-border/40 text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold italic font-serif opacity-80 select-none text-base">fx</span>
            </div>
            <div className="flex-1 px-3 flex items-center bg-transparent whitespace-nowrap overflow-hidden">
              <span className="truncate">
                {activeCell === "B2" ? username : activeCell === "B3" ? "********" : activeCell === "C3" ? "AUTH" : ""}
              </span>
            </div>
          </div>
          <div className="w-6 bg-muted/10" />
        </div>

        {/* Spreadsheet Grid representing the form */}
        <div className="flex-1 bg-[#E1DFDD] dark:bg-muted/30 flex flex-col relative" style={{ height: "340px" }}>
          
          {/* Column Headers */}
          <div className="flex border-b border-border/80 bg-muted/40 text-[11px] font-semibold text-muted-foreground select-none relative z-20">
            <div className="w-12 border-r border-border/60 bg-muted/60 shadow-[1px_0_0_rgba(0,0,0,0.05)]" />
            <div className={`w-36 px-2 py-1 border-r border-border/60 text-center hover:bg-muted/80`}>A</div>
            <div className={`flex-1 max-w-[320px] px-2 py-1 border-r border-border/60 text-center hover:bg-muted/80`}>B</div>
            <div className="w-8 border-r border-border/60 text-center hover:bg-muted/80" />
            <div className="w-32 px-2 py-1 border-r border-border/60 text-center hover:bg-muted/80">C</div>
            <div className="flex-1 px-2 py-1 border-r border-border/60 text-center hover:bg-muted/80">D</div>
          </div>

          {/* Grid Area */}
          <div className="flex-1 overflow-auto bg-background flex flex-col relative z-0">
            {/* Infinite faint background grid */}
            <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: `
                  linear-gradient(hsl(var(--border) / 0.4) 1px, transparent 1px),
                  linear-gradient(90deg, hsl(var(--border) / 0.4) 1px, transparent 1px)
                `,
                backgroundSize: "100px 32px",
                backgroundPosition: "48px 0px"
              }} 
            />

            <form onSubmit={handleSubmit} className="flex flex-col w-full z-10 font-sans text-[13px]">

              {/* Row 1 (Header/Title) */}
              <div className="flex h-8 group hover:bg-muted/5 transition-colors items-stretch">
                <div className="w-12 border-b border-r border-border/60 bg-muted/40 text-center text-[10px] font-medium text-muted-foreground flex items-center justify-center group-hover:bg-muted/60">1</div>
                
                <div className="w-36 border-b border-r border-border/50 bg-background relative">
                  <div className={getCellClass("A1")} onClick={() => setActiveCell("A1")}>
                    {activeCell === "A1" && <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-[#107C41] border border-white cursor-crosshair z-20" />}
                  </div>
                </div>
                
                <div className="flex-1 max-w-[320px] border-b border-r border-border/50" />
                <div className="w-8 border-b border-r border-border/50" />
                <div className="w-32 border-b border-r border-border/50" />
                <div className="flex-1 border-b border-r border-border/50" />
              </div>

              {/* Row 2 (Username) */}
              <div className="flex h-8 group hover:bg-muted/5 transition-colors items-stretch">
                <div className="w-12 border-b border-r border-border/60 bg-muted/40 text-center text-[10px] font-medium text-muted-foreground flex items-center justify-center group-hover:bg-muted/60">2</div>
                
                <div className="w-36 bg-transparent border-b border-r border-border/50 px-3 flex items-center text-muted-foreground cursor-default">
                  Username
                </div>
                
                <div className="flex-1 max-w-[320px]">
                  <div className={getCellClass("B2", true)} onClick={() => { setActiveCell("B2"); usernameRef.current?.focus(); }}>
                    <input
                      ref={usernameRef}
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setActiveCell("B2")}
                      disabled={loading}
                      autoComplete="username"
                      spellCheck={false}
                      autoFocus
                      className="w-full h-full bg-transparent outline-none px-0 text-foreground font-sans placeholder:text-muted-foreground/30"
                      placeholder=""
                    />
                    {activeCell === "B2" && <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-[#107C41] border border-white cursor-crosshair z-20" />}
                  </div>
                </div>

                <div className="w-8 border-b border-r border-border/50" />
                <div className="w-32 border-b border-r border-border/50" />
                <div className="flex-1 border-b border-r border-border/50" />
              </div>

              {/* Row 3 (Passcode & Submit) */}
              <div className="flex h-8 group hover:bg-muted/5 transition-colors items-stretch">
                <div className="w-12 border-b border-r border-border/60 bg-muted/40 text-center text-[10px] font-medium text-muted-foreground flex items-center justify-center group-hover:bg-muted/60">3</div>
                
                <div className="w-36 bg-transparent border-b border-r border-border/50 px-3 flex items-center text-muted-foreground cursor-default">
                  Passcode
                </div>
                
                <div className="flex-1 max-w-[320px]">
                  <div className={`${getCellClass("B3", true)} relative`} onClick={() => setActiveCell("B3")}>
                    <input
                      type={showPass ? "text" : "password"}
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      onFocus={() => setActiveCell("B3")}
                      disabled={loading}
                      autoComplete="current-password"
                      className="w-full h-full bg-transparent outline-none pr-8 text-foreground font-sans placeholder:text-muted-foreground/30"
                      placeholder=""
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => { e.stopPropagation(); setShowPass((v) => !v); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors z-20"
                    >
                      {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    {activeCell === "B3" && <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-[#107C41] border border-white cursor-crosshair z-20" />}
                  </div>
                </div>

                <div className="w-8 border-b border-r border-border/50" />
                
                <div className="w-32 border-b border-r border-border/50">
                  <div className={getCellClass("C3", true)}>
                    <button
                      type="submit"
                      onFocus={() => setActiveCell("C3")}
                      disabled={loading || !username.trim() || !passcode.trim()}
                      className={`
                        w-full h-full flex items-center justify-center gap-1.5 font-bold uppercase tracking-wide text-[11px]
                        transition-colors outline-none
                        ${(!username.trim() || !passcode.trim() || loading) ? "bg-muted text-muted-foreground/50 cursor-not-allowed" : "bg-[#107C41] text-white hover:bg-emerald-700"}
                      `}
                    >
                      {loading ? <><Loader2 className="w-3 h-3 animate-spin" /> RUNNING...</> : "EXECUTE_LOGIN()"}
                    </button>
                    {activeCell === "C3" && <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-[#107C41] border border-white cursor-crosshair z-20" />}
                  </div>
                </div>

                <div className="flex-1 border-b border-r border-border/50 px-3 flex items-center">
                  {error && (
                    <span className="text-[11px] text-[#E81123] font-mono flex items-center gap-2">
                      <span className="font-bold bg-[#E81123]/10 px-1 rounded">#ERROR!</span> {error}
                    </span>
                  )}
                </div>
              </div>

              {/* Extra spacing rows (4-10) to fill the grid visually */}
              {[4, 5, 6, 7, 8, 9, 10].map(rowNum => (
                <div key={rowNum} className="flex h-8 group hover:bg-muted/5 transition-colors items-stretch">
                  <div className="w-12 border-b border-r border-border/60 bg-muted/40 text-center text-[10px] font-medium text-muted-foreground flex items-center justify-center group-hover:bg-muted/60">{rowNum}</div>
                  <div className="w-36 border-b border-r border-border/50" />
                  <div className="flex-1 max-w-[320px] border-b border-r border-border/50 relative">
                    {/* Dummy active cell selection just for visual fun if they click */}
                    <div className={getCellClass(`B${rowNum}`, true)} onClick={() => setActiveCell(`B${rowNum}`)}>
                      {activeCell === `B${rowNum}` && <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-[#107C41] border border-white cursor-crosshair z-20" />}
                    </div>
                  </div>
                  <div className="w-8 border-b border-r border-border/50" />
                  <div className="w-32 border-b border-r border-border/50 relative">
                    <div className={getCellClass(`C${rowNum}`, true)} onClick={() => setActiveCell(`C${rowNum}`)}>
                      {activeCell === `C${rowNum}` && <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-[#107C41] border border-white cursor-crosshair z-20" />}
                    </div>
                  </div>
                  <div className="flex-1 border-b border-r border-border/50 relative">
                    <div className={getCellClass(`D${rowNum}`, true)} onClick={() => setActiveCell(`D${rowNum}`)}>
                      {activeCell === `D${rowNum}` && <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-[#107C41] border border-white cursor-crosshair z-20" />}
                    </div>
                  </div>
                </div>
              ))}

            </form>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-3 py-1 bg-[#107C41] text-white text-[10px] font-sans">
          <div className="flex items-center gap-3">
            <span className="opacity-90 cursor-default">Ready</span>
            <span className="w-px h-3 bg-white/20" />
            <span className="flex items-center gap-1.5 opacity-90 cursor-default">
              <LogStatus />
              Server Connected
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="opacity-80 cursor-default">All data stored locally</span>
            <span className="w-px h-3 bg-white/20" />
            <span className="opacity-80 cursor-default">Powered by Dupoch</span>
            <span className="w-px h-3 bg-white/20" />
            <span className="font-mono cursor-default">100%</span>
            <div className="flex gap-[2px] opacity-100 items-end h-2.5">
              <div className="w-2 h-1 bg-white/60" />
              <div className="w-2 h-[6px] bg-white/80" />
              <div className="w-2 h-full bg-white" />
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-6px); }
          30%      { transform: translateX(6px); }
          45%      { transform: translateX(-4px); }
          60%      { transform: translateX(4px); }
          75%      { transform: translateX(-2px); }
          90%      { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}

function LogStatus() {
  return (
    <div className="relative flex items-center justify-center w-2 h-2">
      <div className="absolute inset-0 rounded-[2px] bg-emerald-200 opacity-60 animate-ping" style={{ animationDuration: "2s" }} />
      <div className="relative w-1.5 h-1.5 rounded-[1px] bg-white opacity-90" />
    </div>
  );
}