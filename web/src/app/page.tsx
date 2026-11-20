"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Check,
  RefreshCw,
  Send,
  Trash2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

import {
  Button,
  Badge,
  StatusDot,
  Dialog,
  DialogContent,
  DialogFooter,
  TooltipProvider,
  ToastProvider,
  useToast,
  Skeleton,
  EmptyState,
  QuoteBlock,
  CommandBar,
  HeroPlayer,
  PipelineTimeline,
  SideStats,
} from "@/components";

type ScreenState = "ready" | "loading" | "empty" | "failure";

function TodayScreenContent() {
  const { addToast } = useToast();

  // Screen View States: ready (default live hero), loading (skeletons), empty, failure
  const [screenState, setScreenState] = React.useState<ScreenState>("ready");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = React.useState(false);
  const [activePreset, setActivePreset] = React.useState("degraaf");
  const [reelStatus, setReelStatus] = React.useState<"ready" | "queued" | "rendering" | "published" | "discarded">("queued");

  // Generate Modal Form State
  const [genCount, setGenCount] = React.useState("5");
  const [genTheme, setGenTheme] = React.useState("hope");
  const [genStyle, setGenStyle] = React.useState("degraaf");
  const [genProvider, setGenProvider] = React.useState("local_folder");

  // Today's Featured Reel Data
  const currentReel = {
    id: 3,
    theme: "Hope",
    mood: "Snow & Winter Light",
    quote:
      "Frost coats the glass tonight, but underneath the sleeping soil, a small seed remembers how to reach for spring.",
    caption:
      "Winter holds promises we cannot yet see in the frozen ground. Take a breath and trust the quiet growth.",
    hashtags: [
      "#nature",
      "#positivity",
      "#naturetherapy",
      "#quietmoments",
      "#winterlight",
      "#gentlehope",
    ],
    videoSrc: "/output/2026-11-20/reel_001/reel.mp4",
    posterSrc: "/output/2026-11-20/reel_001/thumbnail.jpg",
    duration: 11.55,
    resolution: "1080 × 1920",
    contrastRatio: 0.22,
  };

  const handleApprove = () => {
    setReelStatus("queued");
    addToast({
      type: "success",
      title: "Reel Approved",
      description: "Scheduled for today's 18:00 UTC Instagram publication window.",
    });
  };

  const handleRegenerate = () => {
    setReelStatus("rendering");
    addToast({
      type: "info",
      title: "Regenerating Background Footage",
      description: "Selecting new HD winter footage while preserving quote text...",
    });
    setTimeout(() => {
      setReelStatus("ready");
      addToast({
        type: "success",
        title: "Regeneration Complete",
        description: "New background clip matched and re-rendered with 0.24 contrast.",
      });
    }, 2000);
  };

  const handlePublishNow = () => {
    addToast({
      type: "info",
      title: "Publishing to Instagram",
      description: "Uploading MP4 to storage and creating Meta Graph container...",
    });
    setTimeout(() => {
      setReelStatus("published");
      addToast({
        type: "success",
        title: "Live on Instagram Reels",
        description: "Media ID: 18039485729103942 · Permalink generated.",
      });
    }, 2500);
  };

  const handleRunGenerate = () => {
    setIsGenerateModalOpen(false);
    addToast({
      type: "info",
      title: "Batch Generation Initiated",
      description: `Generating ${genCount} quotes with theme '${genTheme}' via Gemini Flash...`,
    });

    setTimeout(() => {
      setScreenState("ready");
      addToast({
        type: "success",
        title: "Batch Generation Complete",
        description: `Successfully rendered and packaged ${genCount} reels for today.`,
      });
    }, 2800);
  };

  return (
    <div className="min-h-screen bg-page text-ink-primary font-sans relative pb-24">
      {/* 1. Floating Top Command Bar */}
      <CommandBar
        activePreset={activePreset}
        isPublishReady={true}
        onGenerate={() => setIsGenerateModalOpen(true)}
        onSearch={() =>
          addToast({
            type: "info",
            title: "Quick Search",
            description: "Opening reel archive and command palette...",
          })
        }
      />

      {/* Main Canvas Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        {/* Top Editorial Kicker & Date */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-widest text-moss font-medium">
                Issue #042 · Today's Curation
              </span>
              <span className="text-ink-muted">•</span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                Dusk Edition
              </span>
            </div>
            <h1 className="font-serif italic text-3xl sm:text-4xl lg:text-5xl font-normal text-ink-primary tracking-tight">
              Quiet Solitude in Winter
            </h1>
          </div>

          {/* Right Meta Info & Navigation pill to /design */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="font-mono text-xs text-ink-primary">
                Friday, 20 Nov 2026
              </span>
              <span className="font-sans text-[11px] text-ink-muted">
                Publishing window: 18:00 UTC
              </span>
            </div>

            <Link
              href="/design"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-surface border border-border hover:border-border-strong text-xs font-mono text-ink-secondary hover:text-ink-primary transition-fast"
            >
              <span>Design System</span>
              <ExternalLink className="w-3 h-3 text-moss" />
            </Link>
          </div>
        </section>

        {/* 2. Side / Header Stats Strip */}
        <section>
          <SideStats
            postsThisWeek={5}
            totalWeeklyTarget={7}
            queueSize={3}
            nextScheduledSlot="Today, 18:00 UTC"
            geminiHealth="healthy"
            instagramHealth="connected"
            storageHealth="ready"
          />
        </section>

        {/* 3. HERO SECTION & DESIGNED STATES */}

        {/* A. LOADING STATE (Skeletons) */}
        {screenState === "loading" && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-4">
            <div className="lg:col-span-5 flex justify-center">
              <Skeleton className="aspect-[9/16] w-full max-w-[360px] rounded-lg" />
            </div>
            <div className="lg:col-span-7 space-y-6 pt-2">
              <Skeleton className="w-32 h-4 rounded-sm" />
              <div className="space-y-3">
                <Skeleton className="w-full h-10 rounded-sm" />
                <Skeleton className="w-5/6 h-10 rounded-sm" />
                <Skeleton className="w-4/6 h-10 rounded-sm" />
              </div>
              <Skeleton className="w-full h-24 rounded-md" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Skeleton className="h-16 rounded-sm" />
                <Skeleton className="h-16 rounded-sm" />
                <Skeleton className="h-16 rounded-sm" />
              </div>
              <div className="flex gap-3 pt-4">
                <Skeleton className="w-36 h-9 rounded-sm" />
                <Skeleton className="w-32 h-9 rounded-sm" />
              </div>
            </div>
          </section>
        )}

        {/* B. EMPTY STATE */}
        {screenState === "empty" && (
          <section className="p-8 md:p-16 rounded-md bg-surface border border-border text-center">
            <EmptyState
              title="The Canvas is Clear"
              description="No reel is currently queued for today. Trigger the Gemini quote generator to match winter footage and render your next aesthetic reel."
              action={
                <Button
                  size="md"
                  variant="primary"
                  icon={<Sparkles className="w-4 h-4" />}
                  onClick={() => setIsGenerateModalOpen(true)}
                >
                  Generate Today's First Reel
                </Button>
              }
            />
          </section>
        )}

        {/* C. FAILURE STATE */}
        {screenState === "failure" && (
          <section className="p-6 md:p-8 rounded-md bg-surface border border-status-error/30 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-status-error/15 border border-status-error/30 flex items-center justify-center shrink-0 text-status-error">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-sans text-base font-semibold text-ink-primary">
                  Render Precheck Failed: Low Luminance Contrast (0.09)
                </h3>
                <p className="font-sans text-xs text-ink-secondary leading-relaxed max-w-2xl">
                  The automated contrast validator detected that the background video region behind the text box
                  does not meet the minimum WCAG AA threshold. The text may be difficult to read on mobile screens.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-sm bg-subtle border border-border text-xs font-mono space-y-1 text-ink-secondary">
              <p><span className="text-ink-muted">Clip:</span> assets/backgrounds/winter_snow.mp4</p>
              <p><span className="text-ink-muted">Calculated Contrast:</span> 0.091 (Required: &gt; 0.180)</p>
              <p><span className="text-ink-muted">Recommended Remedy:</span> Increase darken overlay to 55% or rotate background clip.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                size="sm"
                variant="primary"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => {
                  setScreenState("ready");
                  addToast({
                    type: "success",
                    title: "Auto-Darken Applied",
                    description: "Overlay increased to 52%. Safe contrast verified at 0.23.",
                  });
                }}
              >
                Auto-Darken & Re-Render
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setScreenState("ready");
                  handleRegenerate();
                }}
              >
                Pick Different Footage
              </Button>
            </div>
          </section>
        )}

        {/* D. LIVE / READY STATE: EDITORIAL HERO SPREAD */}
        {screenState === "ready" && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Big 9:16 Video Player */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <HeroPlayer
                videoSrc={currentReel.videoSrc}
                posterSrc={currentReel.posterSrc}
                duration={currentReel.duration}
                status={reelStatus}
              />
              <p className="text-[11px] font-mono text-ink-muted mt-3 text-center">
                Hover to scrub · Spacebar or click to play
              </p>
            </div>

            {/* Right Column: Editorial Typesetting Beside Player */}
            <div className="lg:col-span-7 space-y-6 pt-1">
              {/* Badges / Mood / Theme */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="moss">{currentReel.theme}</Badge>
                <Badge variant="default">{currentReel.mood}</Badge>
                <span className="font-mono text-xs text-ink-muted bg-subtle px-2 py-0.5 rounded-sm border border-border">
                  Style: {activePreset}
                </span>
                <span className="font-mono tabular-nums text-xs text-ink-muted bg-subtle px-2 py-0.5 rounded-sm border border-border">
                  {currentReel.duration}s
                </span>
              </div>

              {/* Large Editorial Serif Quote */}
              <QuoteBlock
                size="xl"
                author="Reel Forge · Autonomous Curation"
                theme={currentReel.theme.toLowerCase()}
              >
                {currentReel.quote}
              </QuoteBlock>

              {/* Instagram Caption & Hashtags Block */}
              <div className="p-4 rounded-md bg-surface border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Instagram Caption
                  </span>
                  <span className="font-mono tabular-nums text-[10px] text-moss font-medium">
                    {currentReel.caption.length} chars
                  </span>
                </div>

                <p className="font-sans text-xs sm:text-sm text-ink-secondary leading-relaxed italic">
                  "{currentReel.caption}"
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentReel.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[11px] text-moss bg-moss-subtle border border-moss/20 px-2 py-0.5 rounded-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Technical Preflight Quality Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-xs">
                <div className="p-3 rounded-sm bg-subtle border border-border space-y-1">
                  <span className="text-[10px] uppercase text-ink-muted block">
                    Contrast Check
                  </span>
                  <div className="flex items-center gap-1.5 text-status-success font-medium">
                    <StatusDot status="success" />
                    <span className="tabular-nums">0.22 (Optimal)</span>
                  </div>
                </div>

                <div className="p-3 rounded-sm bg-subtle border border-border space-y-1">
                  <span className="text-[10px] uppercase text-ink-muted block">
                    Safe Margin
                  </span>
                  <div className="flex items-center gap-1.5 text-status-success font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>90px Compliant</span>
                  </div>
                </div>

                <div className="p-3 rounded-sm bg-subtle border border-border space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase text-ink-muted block">
                    Resolution
                  </span>
                  <span className="text-ink-primary font-mono block">
                    {currentReel.resolution}
                  </span>
                </div>
              </div>

              {/* Editorial Decision Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-border">
                <Button
                  size="md"
                  variant="primary"
                  onClick={handlePublishNow}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  Publish Now
                </Button>

                <Button
                  size="md"
                  variant="secondary"
                  onClick={handleApprove}
                  icon={<Check className="w-3.5 h-3.5 text-status-success" />}
                >
                  Approve for 18:00
                </Button>

                <Button
                  size="md"
                  variant="secondary"
                  onClick={handleRegenerate}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Regenerate Clip
                </Button>

                <Button
                  size="md"
                  variant="ghost"
                  onClick={() => {
                    setReelStatus("discarded");
                    addToast({
                      type: "info",
                      title: "Reel Discarded",
                      description: "Moved to output/_rejected/ partition.",
                    });
                  }}
                  icon={<Trash2 className="w-3.5 h-3.5 text-status-error" />}
                >
                  Discard
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* 4. CALM PIPELINE TIMELINE UNDER THE HERO */}
        <section>
          <PipelineTimeline />
        </section>

        {/* 5. FOOTER & STATE SWITCHER */}
        <footer className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-ink-muted">
          <div className="flex items-center gap-2">
            <span>Reel Forge v0.1.0</span>
            <span>•</span>
            <span className="text-moss font-medium">Light Editorial</span>
          </div>

          {/* Interactive State Switcher for reviewer inspection */}
          <div className="flex items-center gap-1.5 p-1 rounded-sm bg-surface border border-border">
            <span className="text-[10px] text-ink-muted px-2 uppercase tracking-widest">
              State:
            </span>
            <button
              onClick={() => setScreenState("ready")}
              className={`px-2.5 py-1 rounded-sm text-[11px] transition-fast ${
                screenState === "ready"
                  ? "bg-moss text-white font-medium"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              Live
            </button>
            <button
              onClick={() => setScreenState("loading")}
              className={`px-2.5 py-1 rounded-sm text-[11px] transition-fast ${
                screenState === "loading"
                  ? "bg-moss text-white font-medium"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              Loading
            </button>
            <button
              onClick={() => setScreenState("empty")}
              className={`px-2.5 py-1 rounded-sm text-[11px] transition-fast ${
                screenState === "empty"
                  ? "bg-moss text-white font-medium"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              Empty
            </button>
            <button
              onClick={() => setScreenState("failure")}
              className={`px-2.5 py-1 rounded-sm text-[11px] transition-fast ${
                screenState === "failure"
                  ? "bg-status-error text-white font-medium"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              Error
            </button>
          </div>
        </footer>
      </main>

      {/* GENERATE BATCH DIALOG */}
      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent title="Generate Quote Reels" description="Configure autonomous batch generation parameters.">
          <div className="space-y-4 py-2 text-xs font-sans text-ink-secondary">
            {/* Count Selector */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] text-ink-muted uppercase tracking-wider block">
                Batch Count
              </label>
              <div className="grid grid-cols-4 gap-2">
                {["1", "3", "5", "10"].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setGenCount(cnt)}
                    className={`py-2 rounded-sm border font-mono text-xs transition-fast ${
                      genCount === cnt
                        ? "bg-moss text-white border-moss"
                        : "bg-surface border-border text-ink-secondary hover:border-border-strong"
                    }`}
                  >
                    {cnt} Reels
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selector */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] text-ink-muted uppercase tracking-wider block">
                Theme / Philosophy
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "hope", label: "Hope" },
                  { id: "solitude", label: "Solitude" },
                  { id: "gratitude", label: "Gratitude" },
                  { id: "resilience", label: "Resilience" },
                  { id: "calm", label: "Calm Nature" },
                  { id: "mystery", label: "Forest Dark" },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setGenTheme(th.id)}
                    className={`py-2 px-2.5 rounded-sm border text-xs text-left transition-fast ${
                      genTheme === th.id
                        ? "bg-moss-subtle border-moss/40 text-ink-primary font-medium"
                        : "bg-surface border-border text-ink-secondary hover:border-border-strong"
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Style Selector */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] text-ink-muted uppercase tracking-wider block">
                Typography & Grade Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "degraaf", name: "De Graaf (Editorial Serif)" },
                  { id: "serif_quiet", name: "Serif Quiet (Newsreader)" },
                  { id: "sans_minimal", name: "Sans Minimal (Clean)" },
                  { id: "random", name: "Random Preset Rotation" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setGenStyle(st.id);
                      setActivePreset(st.id);
                    }}
                    className={`py-2 px-2.5 rounded-sm border text-xs text-left transition-fast ${
                      genStyle === st.id
                        ? "bg-moss-subtle border-moss/40 text-ink-primary font-medium"
                        : "bg-surface border-border text-ink-secondary hover:border-border-strong"
                    }`}
                  >
                    {st.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Provider */}
            <div className="space-y-1.5">
              <label className="font-mono text-[11px] text-ink-muted uppercase tracking-wider block">
                Background Footage Source
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "local_folder", name: "Local Assets" },
                  { id: "pexels", name: "Pexels 1080p" },
                  { id: "gdrive", name: "Google Drive" },
                ].map((prov) => (
                  <button
                    key={prov.id}
                    onClick={() => setGenProvider(prov.id)}
                    className={`py-2 px-2 rounded-sm border text-xs text-center transition-fast ${
                      genProvider === prov.id
                        ? "bg-moss-subtle border-moss/40 text-ink-primary font-medium"
                        : "bg-surface border-border text-ink-secondary hover:border-border-strong"
                    }`}
                  >
                    {prov.name}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsGenerateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={handleRunGenerate}
              >
                Generate {genCount} Reels
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TodayScreenPage() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <TodayScreenContent />
      </TooltipProvider>
    </ToastProvider>
  );
}
