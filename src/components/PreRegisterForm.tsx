import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, FileSpreadsheet, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Max 80 characters"),
  email: z.string().trim().email("Enter a valid email").max(160),
  organization: z.string().trim().max(120).optional().or(z.literal("")),
  occupation: z.string().trim().max(120).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

const COLS = ["A", "B", "C", "D"] as const;
const FIELDS = [
  { key: "name", col: "A", label: "Full name", required: true, placeholder: "Ada Lovelace" },
  { key: "email", col: "B", label: "Work email", required: true, placeholder: "ada@company.com" },
  { key: "organization", col: "C", label: "Organization", required: false, placeholder: "Lovelace & Co." },
  { key: "occupation", col: "D", label: "Occupation", required: false, placeholder: "Data Analyst" },
] as const;

export function PreRegisterForm() {
  const [submitted, setSubmitted] = useState<FormValues | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormValues>({
    defaultValues: { name: "", email: "", organization: "", occupation: "" },
  });

  const values = watch();

  const onSubmit = async (raw: FormValues) => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof FormValues | undefined;
        if (path) setError(path, { type: "manual", message: issue.message });
      }
      return;
    }
    
    const data = parsed.data;

    try {
      // 1. Submit to Supabase
      const { error: dbError } = await supabase
        .from("talktoexl")
        .insert([
          {
            name: data.name,
            email: data.email,
            organization: data.organization || null,
            occupation: data.occupation || null,
          }
        ]);

      if (dbError) {
        console.error("Supabase insert error:", dbError);
        // We continue to local storage backup even if DB fails
      }
    } catch (err) {
      console.error("Preregistration submission failed:", err);
    }

    // 2. Persist locally as secondary backup
    try {
      const key = "talktoexl_preregistrations";
      const existing = JSON.parse(localStorage.getItem(key) ?? "[]");
      existing.push({ ...data, ts: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) {
      /* ignore */
    }

    setSubmitted(data);
    toast.success("You're on the waitlist!", {
      description: "We'll email you when early access opens.",
    });
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elevated)] text-center animate-fade-up">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-semibold">Welcome aboard, {submitted.name.split(" ")[0]}!</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Row added to our waitlist sheet. We'll reach out at <span className="font-medium text-foreground">{submitted.email}</span> when early access opens.
        </p>
        <button
          onClick={() => setSubmitted(null)}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Add another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)]"
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border bg-[var(--color-excel-green)] px-4 py-2.5 text-primary-foreground">
        <FileSpreadsheet className="h-4 w-4" />
        <span className="text-sm font-semibold">waitlist.xlsx</span>
        <span className="ml-2 rounded bg-white/15 px-2 py-0.5 text-[10px] font-medium">Sheet1</span>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] opacity-80">
          <span>Auto-saved</span>
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        </div>
      </div>

      {/* Formula bar */}
      <div className="flex items-center gap-2 border-b border-[var(--color-excel-grid)] bg-[var(--color-excel-header)] px-3 py-1.5">
        <span className="rounded border border-[var(--color-excel-grid)] bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground">A2</span>
        <span className="font-mono text-[13px] text-muted-foreground">fx</span>
        <span className="font-mono text-[12px] text-foreground/80">= JOIN_WAITLIST(name, email, [organization], [occupation])</span>
      </div>

      {/* Sheet grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-10 border-r border-b border-[var(--color-excel-grid)] bg-[var(--color-excel-header)] py-1 font-mono text-[10px] font-normal text-muted-foreground" />
              {COLS.map((c) => (
                <th
                  key={c}
                  className="border-r border-b border-[var(--color-excel-grid)] bg-[var(--color-excel-header)] px-3 py-1 text-left font-mono text-[10px] font-semibold text-muted-foreground"
                >
                  {c}
                </th>
              ))}
            </tr>
            <tr>
              <td className="w-10 border-r border-b border-[var(--color-excel-grid)] bg-[var(--color-excel-header)] py-1.5 text-center font-mono text-[10px] text-muted-foreground">1</td>
              {FIELDS.map((f) => (
                <td
                  key={f.key}
                  className="border-r border-b border-[var(--color-excel-grid)] bg-[var(--color-excel-header)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/80"
                >
                  {f.label}
                  {f.required && <span className="ml-0.5 text-destructive">*</span>}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="w-10 border-r border-b border-[var(--color-excel-grid)] bg-[var(--color-excel-header)] py-2 text-center font-mono text-[10px] text-muted-foreground">2</td>
              {FIELDS.map((f) => {
                const error = errors[f.key as keyof FormValues];
                const filled = !!values[f.key as keyof FormValues];
                return (
                  <td
                    key={f.key}
                    className={`relative border-r border-b border-[var(--color-excel-grid)] p-0 transition ${
                      error ? "ring-2 ring-inset ring-destructive/60 bg-destructive/5" : filled ? "bg-success/5" : "bg-card"
                    } focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary/60 focus-within:bg-primary/5`}
                  >
                    <input
                      {...register(f.key as keyof FormValues)}
                      placeholder={f.placeholder}
                      type={f.key === "email" ? "email" : "text"}
                      autoComplete={f.key === "email" ? "email" : f.key === "name" ? "name" : "organization"}
                      className="w-full bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
                    />
                  </td>
                );
              })}
            </tr>
            {/* Empty rows for the spreadsheet feel */}
            {[3, 4].map((rn) => (
              <tr key={rn}>
                <td className="w-10 border-r border-b border-[var(--color-excel-grid)] bg-[var(--color-excel-header)] py-2 text-center font-mono text-[10px] text-muted-foreground">{rn}</td>
                {COLS.map((c) => (
                  <td key={c} className="border-r border-b border-[var(--color-excel-grid)] bg-card/40 px-3 py-2.5">&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Errors */}
      {(errors.name || errors.email) && (
        <div className="space-y-1 border-t border-border bg-destructive/5 px-4 py-2 text-xs text-destructive">
          {errors.name && <p>• {errors.name.message}</p>}
          {errors.email && <p>• {errors.email.message}</p>}
        </div>
      )}

      {/* Status bar / submit */}
      <div className="flex flex-col gap-3 border-t border-border bg-[var(--color-excel-header)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" /> Ready
          </span>
          <span>· 1 row pending</span>
          <span className="hidden sm:inline">· * required</span>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--color-excel-green-dark)] disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving row…
            </>
          ) : (
            <>Submit row & join waitlist</>
          )}
        </button>
      </div>
    </form>
  );
}
