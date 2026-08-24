import { TalkToExlDemo } from "@/components/demo/TalkToExlDemo";
import { ResponsiveDemoFrame } from "@/components/demo/ResponsiveDemoFrame";
import { PreRegisterForm } from "@/components/PreRegisterForm";
import logoUrl from "@/assets/logo.png";
import {
  Sparkles,
  Eye,
  ShieldCheck,
  Workflow,
  Wand2,
  Zap,
  ArrowRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground font-sans relative">
      <div className="fixed top-6 left-6 z-50 flex items-center gap-2.5 font-bold tracking-tight text-foreground/90">
        <Logo />
        <span className="text-sm">talktoexl</span>
      </div>
      <Hero />
      <Perks />
      <PreRegisterSection />
      <Footer />
    </main>
  );
}

function Logo() {
  return (
    <img src={logoUrl} alt="talktoexl logo" className="h-7 w-7 object-contain" />
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
          <Logo />
          <span>talktoexl</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#perks" className="hover:text-foreground">Why us</a>
          <a href="#waitlist" className="hover:text-foreground">Pre-register</a>
        </nav>
        <a
          href="#waitlist"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          Get early access <ArrowRight className="h-3 w-3" />
        </a>
      </div>
    </header>
  );
}

import { WaitlistBanner } from "@/components/WaitlistBanner";

function Hero() {
  return (
    <section id="top" className="px-4 pt-20 pb-16 min-h-[90vh] flex flex-col justify-center">
      <div className="mx-auto max-w-6xl w-full">
        <div className="mx-auto max-w-3xl text-center mb-8">
          <div className="mb-6">
            <WaitlistBanner />
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            We let your <span className="text-primary">sheet talk</span>
          </h1>
        </div>

        <div className="mx-auto max-w-5xl">
          <ResponsiveDemoFrame baseWidth={920} baseHeight={540} minScale={0.35}>
            <TalkToExlDemo />
          </ResponsiveDemoFrame>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#waitlist"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-opacity-90 hover:scale-[1.02]"
          >
            Pre-register for early access <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="#perks"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium transition hover:bg-muted"
          >
            See what it does
          </a>
        </div>
      </div>
    </section>
  );
}

function Perks() {
  const perks = [
    {
      icon: Eye,
      title: "Visual previews ",
      body: "Every filter, edit, or transformation is highlighted in your sheet before it commits. No more guessing what the AI did.",
    },
    {
      icon: ShieldCheck,
      title: "Zero-risk operations",
      body: "Nothing changes until you approve. Diffs and undo on every step keep your data safe.",
    },
    {
      icon: Workflow,
      title: "Save & replay pipelines",
      body: "Turn ad-hoc queries into reusable workflows. Re-run the same logic on next month's sheet in one click.",
    },
    {
      icon: Wand2,
      title: "Natural-language editing",
      body: "“Set @price to cost × 1.3 where @margin < 10%.” That's it. No formulas, no macros, no VLOOKUP gymnastics.",
    },
    {
      icon: Zap,
      title: "Bulk ops at AI speed",
      body: "Update thousands of rows in seconds with a single instruction — and watch each batch preview as it runs.",
    },
    {
      icon: Sparkles,
      title: "Browser-native, zero setup",
      body: "Open a sheet, start typing. No installs, no plugins, no syncing. Your file stays local to your browser.",
    },
  ];
  return (
    <section id="perks" className="px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Not just another AI wrapper
          </h2>
          <p className="mt-3 text-muted-foreground">
            Most tools generate code you have to trust. talktoexl shows you exactly what changes
            before it touches a single cell.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {perks.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-border bg-card p-6 transition hover:border-primary/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PreRegisterSection() {
  return (
    <section id="waitlist" className="border-t border-border/60 bg-card/30 px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Limited early access
          </span>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Add yourself to the sheet.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Fill the row below: name and email are required. We'll email you when your seat opens up.
          </p>
        </div>
        <div className="mt-10">
          <PreRegisterForm />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-3">
          <Logo />
          <a href="https://dupoch.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:opacity-80">dupoch</a>
          <span className="opacity-40">|</span>
          <span>© {new Date().getFullYear()} talktoexl</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#perks" className="hover:text-foreground">Why us</a>
          <a href="#waitlist" className="hover:text-foreground">Pre-register</a>
        </div>
      </div>
    </footer>
  );
}
