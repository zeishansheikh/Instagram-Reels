"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Check,
  RefreshCw,
  Send,
  Trash2,
  Layers,
  Film,
  Clock,
  AlertCircle,
  Eye,
  Sliders,
  Maximize2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Compass,
} from "lucide-react";

import {
  Button,
  IconButton,
  Badge,
  StatusDot,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Modal,
  ModalTrigger,
  ModalContent,
  ModalClose,
  TooltipProvider,
  Tooltip,
  ToastProvider,
  useToast,
  Skeleton,
  EmptyState,
  QuoteText,
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
  const [isGenerating, setIsGenerating] = React.useState(false);
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
    datePartition: "2026-11-20",
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
    videoSrc: "/static/output/2026-11-20/reel_001/reel.mp4",
    posterSrc: "/static/output/2026-11-20/reel_001/thumbnail.jpg",
    duration: 11.55,
    resolution: "1080 × 1920",
    fps: 30,
    contrastRatio: 0.22,
    safeMargin: "Inside 90px Margin",
    colorOverlay: "42% Basalt Vignette",
    audioMode: "Royalty-Free Baked Audio",
    fileSize: "4.78 MB",
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
      description: "Uploading MP4 to Supabase storage and creating Meta Graph container...",
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
    setIsGenerating(true);
    addToast({
      type: "info",
      title: "Batch Generation Initiated",
      description: `Generating ${genCount} quotes with theme '${genTheme}' via Gemini Flash...`,
    });

    setTimeout(() => {
      setIsGenerating(false);
      setScreenState("ready");
      addToast({
        type: "success",
        title: "Batch Generation Complete",
        description: `Successfully rendered and packaged ${genCount} reels for today.`,
      });
    }, 2800);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink-primary font-sans relative pb-24">
      {/* 1. Floating Top Command Bar */}
      <CommandBar
        activePreset={activePreset}
        isPublishReady={true}
        onGenerate={() => setIsGenerateModalOpen(true)}
        onReview={() => setScreenState("ready")}
        onSearch={() =>
          addToast({
            type: "info",
            title: "Quick Search",
            description: "Opening reel archive and command palette...",
          })
        }
        className="animate-stagger-1"
      />

      {/* Main Canvas Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        {/* Top Editorial Kicker & Date */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-subtle/50 pb-6 animate-stagger-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-widest text-alpenglow">
                Issue #042 · Today's Curation
              </span>
              <span className="text-border-medium">•</span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                Dusk Edition
              </span>
            </div>
            <h1 className="font-serif italic text-3xl sm:text-4xl lg:text-5xl font-light text-ink-primary tracking-tight">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-canvas-card border border-border-subtle hover:border-border-focus text-xs font-mono text-ink-secondary hover:text-ink-primary transition-colors"
            >
              <span>Design System</span>
              <ExternalLink className="w-3 h-3 text-alpenglow" />
            </Link>
          </div>
        </section>

        {/* 2. Side / Header Stats Strip (Kept minimal: posts this week, queue size, token health) */}
        <section className="animate-stagger-2">
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
              <Skeleton className="aspect-[9/16] w-full max-w-[360px] rounded-[18px]" />
            </div>
            <div className="lg:col-span-7 space-y-6 pt-2">
              <Skeleton className="w-32 h-4 rounded" />
              <div className="space-y-3">
                <Skeleton className="w-full h-10 rounded" />
                <Skeleton className="w-5/6 h-10 rounded" />
                <Skeleton className="w-4/6 h-10 rounded" />
              </div>
              <Skeleton className="w-full h-24 rounded-[12px]" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Skeleton className="h-16 rounded-[8px]" />
                <Skeleton className="h-16 rounded-[8px]" />
                <Skeleton className="h-16 rounded-[8px]" />
              </div>
              <div className="flex gap-3 pt-4">
                <Skeleton className="w-36 h-10 rounded-full" />
                <Skeleton className="w-32 h-10 rounded-full" />
              </div>
            </div>
          </section>
        )}

        {/* B. EMPTY STATE (No Reel for Today Yet) */}
        {screenState === "empty" && (
          <section className="p-8 md:p-16 rounded-[20px] bg-canvas-surface/60 border border-border-subtle shadow-card text-center">
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

        {/* C. FAILURE STATE (Render/Contrast Error) */}
        {screenState === "failure" && (
          <section className="p-6 md:p-8 rounded-[16px] bg-canvas-surface border border-duskerror/40 shadow-card space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-duskerror/15 border border-duskerror/30 flex items-center justify-center shrink-0 text-duskerror">
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

            <div className="p-4 rounded-[10px] bg-canvas-card border border-border-subtle text-xs font-mono space-y-1 text-ink-secondary">
              <p><span className="text-ink-muted">Clip:</span> assets/backgrounds/WhatsApp Video 2026-11-20 at 6.36.16 AM.mp4</p>
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
                variant="ghost"
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
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start animate-stagger-3">
            {/* Left Column: Big 9:16 Cinematic Video Player */}
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
                <Badge variant="alpenglow">{currentReel.theme}</Badge>
                <Badge variant="mist">{currentReel.mood}</Badge>
                <span className="font-mono text-xs text-ink-muted bg-canvas-card px-2.5 py-0.5 rounded-[4px] border border-border-subtle">
                  Style: {activePreset}
                </span>
                <span className="font-mono text-xs text-ink-muted bg-canvas-card px-2.5 py-0.5 rounded-[4px] border border-border-subtle">
                  {currentReel.duration}s
                </span>
              </div>

              {/* Large Editorial Serif Quote */}
              <div className="space-y-3">
                <QuoteText
                  author="Reel Forge · Autonomous Curation"
                  theme={currentReel.theme.toLowerCase()}
                  size="xl"
                  className="text-2xl sm:text-3xl lg:text-4xl text-ink-primary font-light leading-[1.3] tracking-tight"
                >
                  {currentReel.quote}
                </QuoteText>
              </div>

              {/* Instagram Caption & Hashtags Block */}
              <div className="p-4 rounded-[12px] bg-canvas-surface/80 border border-border-subtle space-y-3 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Instagram Caption
                  </span>
                  <span className="font-mono text-[10px] text-mist">
                    Character Count: {currentReel.caption.length}
                  </span>
                </div>

                <p className="font-sans text-xs sm:text-sm text-ink-secondary leading-relaxed italic">
                  "{currentReel.caption}"
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentReel.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[11px] text-alpenglow/90 bg-alpenglow-glow/20 px-2 py-0.5 rounded-[4px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Technical Preflight Quality Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-xs">
                <div className="p-3 rounded-[8px] bg-canvas-card/60 border border-border-subtle space-y-1">
                  <span className="text-[10px] uppercase text-ink-muted block">
                    Contrast Check
                  </span>
                  <div className="flex items-center gap-1.5 text-mist">
                    <StatusDot status="mist" />
                    <span>0.22 (Optimal)</span>
                  </div>
                </div>

                <div className="p-3 rounded-[8px] bg-canvas-card/60 border border-border-subtle space-y-1">
                  <span className="text-[10px] uppercase text-ink-muted block">
                    Safe Margin
                  </span>
                  <div className="flex items-center gap-1.5 text-mist">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>90px Compliant</span>
                  </div>
                </div>

                <div className="p-3 rounded-[8px] bg-canvas-card/60 border border-border-subtle space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase text-ink-muted block">
                    Resolution
                  </span>
                  <span className="text-ink-primary font-mono block">
                    {currentReel.resolution}
                  </span>
                </div>
              </div>

              {/* Editorial Decision Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border-subtle/50">
                <Button
                  size="md"
                  variant="primary"
                  onClick={handlePublishNow}
                  icon={<Send className="w-4 h-4" />}
                >
                  Publish Now
                </Button>

                <Button
                  size="md"
                  variant="ghost"
                  onClick={handleApprove}
                  icon={<Check className="w-4 h-4 text-mist" />}
                >
                  Approve for 18:00
                </Button>

                <Button
                  size="md"
                  variant="ghost"
                  onClick={handleRegenerate}
                  icon={<RefreshCw className="w-4 h-4 text-alpenglow" />}
                >
                  Regenerate Clip
                </Button>

                <Button
                  size="md"
                  variant="quiet"
                  onClick={() => {
                    setReelStatus("discarded");
                    addToast({
                      type: "info",
                      title: "Reel Discarded",
                      description: "Moved to output/_rejected/ partition.",
                    });
                  }}
                  icon={<Trash2 className="w-4 h-4 text-ink-muted" />}
                >
                  Discard
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* 4. CALM PIPELINE TIMELINE UNDER THE HERO */}
        <section className="animate-stagger-4">
          <PipelineTimeline />
        </section>

        {/* 5. FOOTER & STATE SWITCHER (FOR PREVIEWING ALL DESIGNED STATES) */}
        <footer className="pt-8 border-t border-border-subtle/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-ink-muted animate-stagger-5">
          <div className="flex items-center gap-2">
            <span>Reel Forge v0.1.0</span>
            <span>•</span>
            <span className="text-alpenglow">Dusk Editorial UI</span>
          </div>

          {/* Interactive State Switcher for reviewer inspection */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-canvas-card border border-border-subtle">
            <span className="text-[10px] text-ink-muted px-2 uppercase tracking-widest">
              State:
            </span>
            <button
              onClick={() => setScreenState("ready")}
              className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${
                screenState === "ready"
                  ? "bg-alpenglow text-white font-medium"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              Live
            </button>
            <button
              onClick={() => setScreenState("loading")}
              className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${
                screenState === "loading"
                  ? "bg-alpenglow text-white font-medium"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              Loading
            </button>
            <button
              onClick={() => setScreenState("empty")}
              className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${
                screenState === "empty"
                  ? "bg-alpenglow text-white font-medium"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              Empty
            </button>
            <button
              onClick={() => setScreenState("failure")}
              className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${
                screenState === "failure"
                  ? "bg-duskerror text-white font-medium"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              Error
            </button>
          </div>
        </footer>
      </main>

      {/* GENERATE BATCH MODAL */}
      <Modal open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <ModalContent title="Generate Quote Reels" description="Configure autonomous batch generation parameters.">
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
                    className={`py-2 rounded-[8px] border font-mono text-xs transition-colors ${
                      genCount === cnt
                        ? "bg-alpenglow text-white border-alpenglow"
                        : "bg-canvas-card border-border-subtle text-ink-secondary hover:border-border-medium"
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
                    className={`py-2 px-2.5 rounded-[8px] border text-xs text-left transition-colors ${
                      genTheme === th.id
                        ? "bg-alpenglow/15 border-alpenglow text-ink-primary font-medium"
                        : "bg-canvas-card border-border-subtle text-ink-secondary hover:border-border-medium"
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
                  { id: "serif_quiet", name: "Serif Quiet (Fraunces)" },
                  { id: "sans_minimal", name: "Sans Minimal (Clean)" },
                  { id: "random", name: "Random Rotation" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setGenStyle(st.id);
                      setActivePreset(st.id);
                    }}
                    className={`py-2 px-2.5 rounded-[8px] border text-xs text-left transition-colors ${
                      genStyle === st.id
                        ? "bg-alpenglow/15 border-alpenglow text-ink-primary font-medium"
                        : "bg-canvas-card border-border-subtle text-ink-secondary hover:border-border-medium"
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
                    className={`py-2 px-2 rounded-[8px] border text-xs text-center transition-colors ${
                      genProvider === prov.id
                        ? "bg-alpenglow/15 border-alpenglow text-ink-primary font-medium"
                        : "bg-canvas-card border-border-subtle text-ink-secondary hover:border-border-medium"
                    }`}
                  >
                    {prov.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-border-subtle/50 flex items-center justify-end gap-2">
              <Button
                variant="quiet"
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
            </div>
          </div>
        </ModalContent>
      </Modal>
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
