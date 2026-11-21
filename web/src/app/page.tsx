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
  Film,
  BookOpen,
  Layers,
  Clock,
  ArrowRight,
  TrendingUp,
  Key,
} from "lucide-react";

import {
  AppShell,
  Button,
  Badge,
  StatusDot,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  TooltipProvider,
  ToastProvider,
  useToast,
  Skeleton,
  EmptyState,
  QuoteBlock,
  HeroPlayer,
} from "@/components";

type ScreenState = "ready" | "loading" | "empty" | "error";

interface PipelineStep {
  name: string;
  status: "completed" | "active" | "pending";
  detail: string;
  timestamp: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    name: "Clip picked",
    status: "completed",
    detail: "WhatsApp Video #1 · 1024×576 @ 30fps · Luma 0.19",
    timestamp: "08:15:10",
  },
  {
    name: "Quote written",
    status: "completed",
    detail: "Roman Urdu (Loss) · Noto Serif SemiBold 30pt",
    timestamp: "08:15:32",
  },
  {
    name: "Rendered",
    status: "completed",
    detail: "1080×1920 @ 60fps · Lanczos upscale · CRF 16",
    timestamp: "08:16:45",
  },
  {
    name: "Queued",
    status: "active",
    detail: "Staged in swap/ready_to_post · Manifest verified",
    timestamp: "08:17:02",
  },
  {
    name: "Published",
    status: "pending",
    detail: "Scheduled for 18:00 UTC · Buffer @enoent.7",
    timestamp: "Pending",
  },
];

export default function TodayPage() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <TodayScreenContent />
      </TooltipProvider>
    </ToastProvider>
  );
}

function TodayScreenContent() {
  const { addToast } = useToast();

  // Screen View States: ready (default), loading (skeleton), empty, error
  const [screenState, setScreenState] = React.useState<ScreenState>("ready");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = React.useState(false);
  const [reelStatus, setReelStatus] = React.useState<"ready" | "queued" | "rendering" | "published" | "discarded">("queued");

  // Realistic seed data matching Formula D3
  const currentReel = {
    id: "reel_2026-11-21_a",
    slot: "Slot A",
    scheduledTime: "Today, 18:00 UTC (08:30 PKT)",
    clipName: "WhatsApp_Video_2026-11-20_at_6.36.16_AM",
    style: "d3_roman_urdu",
    theme: "Loss & Yaadein",
    song: "Dil Ki Khamoshi - alonesinghkdm",
    quote: "toote huye dil ke tukde sambhalte nahi, / aur log puchte hain tum badal kyu gaye.",
    caption:
      "toote huye dil ke tukde sambhalte nahi,\naur log puchte hain tum badal kyu gaye.\n\n#sad #dard #tanhai",
    hashtags: ["#sad", "#dard", "#tanhai"],
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
    duration: 5.42,
    resolution: "1080 × 1920 @ 60fps",
    bitrate: "15.02 Mbps",
    contrastRatio: 0.22,
    placementBand: "y = 800 (luma: 76.1)",
  };

  const handleApprove = () => {
    setReelStatus("queued");
    addToast({
      type: "success",
      title: "Reel Approved",
      description: "Slot A confirmed for today's 18:00 UTC Buffer queue.",
    });
  };

  const handleRegenerate = () => {
    setReelStatus("rendering");
    addToast({
      type: "info",
      title: "Regenerating Background Footage",
      description: "Fetching next fresh Pinterest nature clip and running 60fps prep...",
    });
    setTimeout(() => {
      setReelStatus("ready");
      addToast({
        type: "success",
        title: "Regeneration Complete",
        description: "New clip matched. Contrast re-verified at 0.24.",
      });
    }, 1800);
  };

  const handlePublishNow = () => {
    addToast({
      type: "info",
      title: "Publishing via Buffer",
      description: "Dispatching direct release to @enoent.7 / noori.shed...",
    });
    setTimeout(() => {
      setReelStatus("published");
      addToast({
        type: "success",
        title: "Published to Instagram",
        description: "Media ID: 18042918402941 · Live link recorded.",
      });
    }, 2000);
  };

  return (
    <AppShell
      title="Today"
      subtitle="Friday, 21 Nov 2026"
      onGenerateClick={() => setIsGenerateModalOpen(true)}
      onSearchClick={() =>
        addToast({
          type: "info",
          title: "Quick Search",
          description: "Search dialog activated (Cmd+K).",
        })
      }
    >
      <div className="space-y-8">
        {/* =====================================================================
            1. PAGE HEADER STRIP
            ===================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs text-ink-muted uppercase tracking-wider">
              <span className="text-moss font-medium">Dispatch #042</span>
              <span>/</span>
              <span>Slot A & B Ready</span>
              <span>/</span>
              <span>Formula D3</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-ink-primary tracking-tight">
              Daily Broadcast Overview
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-ink-secondary">
            <span>Channel: <strong className="text-ink-primary font-medium">@enoent.7</strong></span>
            <span className="text-border-strong">|</span>
            <span>Cadence: <strong className="text-ink-primary font-medium">2 reels today</strong></span>
          </div>
        </div>

        {/* =====================================================================
            2. DESIGNED SCREEN STATES: SKELETON / EMPTY / ERROR
            ===================================================================== */}

        {/* A. SKELETON LOADING STATE */}
        {screenState === "loading" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 7 cols Skeleton */}
            <div className="lg:col-span-7 space-y-4">
              <Skeleton className="w-32 h-4 rounded-sm" />
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
                <div className="sm:col-span-6 lg:col-span-5 flex justify-center">
                  <Skeleton className="aspect-[9/16] w-full max-w-[360px] rounded-md" />
                </div>
                <div className="sm:col-span-6 lg:col-span-7 space-y-4">
                  <Skeleton className="w-48 h-5 rounded-sm" />
                  <Skeleton className="w-full h-16 rounded-sm" />
                  <Skeleton className="w-full h-24 rounded-sm" />
                  <div className="space-y-2">
                    <Skeleton className="w-full h-4 rounded-sm" />
                    <Skeleton className="w-3/4 h-4 rounded-sm" />
                    <Skeleton className="w-2/3 h-4 rounded-sm" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="w-24 h-8 rounded-sm" />
                    <Skeleton className="w-28 h-8 rounded-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 cols Skeleton */}
            <div className="lg:col-span-5 space-y-6">
              <Skeleton className="w-full h-64 rounded-md" />
              <Skeleton className="w-full h-40 rounded-md" />
            </div>
          </div>
        )}

        {/* B. EMPTY STATE */}
        {screenState === "empty" && (
          <div className="p-12 md:p-16 rounded-md bg-surface border border-border text-center max-w-2xl mx-auto">
            <EmptyState
              title="No Reel Staged for Today"
              description="The publishing queue is empty. Generate fresh nature quotes and render your next aesthetic reel with 1080p60 quality gates."
              action={
                <Button
                  size="md"
                  variant="primary"
                  icon={<Sparkles className="w-4 h-4" />}
                  onClick={() => setIsGenerateModalOpen(true)}
                >
                  Generate Reel for Slot A
                </Button>
              }
            />
          </div>
        )}

        {/* C. ERROR STATE */}
        {screenState === "error" && (
          <div className="p-6 md:p-8 rounded-md bg-surface border border-status-error/40 space-y-4 max-w-3xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-sm bg-status-error/10 border border-status-error/30 flex items-center justify-center shrink-0 text-status-error">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-sans text-sm font-semibold text-ink-primary">
                  Preflight Quality Gate Check Failed
                </h3>
                <p className="font-sans text-xs text-ink-secondary leading-relaxed">
                  The automated contrast gate detected insufficient luminance separation behind the text placement band.
                  WCAG AA compliance requires &gt; 0.180, measured at 0.091.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-sm bg-subtle border border-border text-xs font-mono space-y-1 text-ink-secondary">
              <p><span className="text-ink-muted">Clip:</span> assets/backgrounds/WhatsApp Video 2026-11-20 at 6.36.16 AM.mp4</p>
              <p><span className="text-ink-muted">Band:</span> Center column x: 340–740, y: 960 (Measured Luma: 84.2 &gt; 80.0 limit)</p>
              <p><span className="text-ink-muted">Action:</span> Shift placement lock to darker band at y=800 or apply adaptive grade.</p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <Button
                size="sm"
                variant="primary"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => {
                  setScreenState("ready");
                  addToast({
                    type: "success",
                    title: "Quality Remediated",
                    description: "Shifted placement lock to y=800 with contrast 0.22.",
                  });
                }}
              >
                Auto-Fix & Re-Render
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setScreenState("ready");
                  handleRegenerate();
                }}
              >
                Rotate to Next Clip
              </Button>
            </div>
          </div>
        )}

        {/* =====================================================================
            3. LIVE TODAY SCREEN: 12-COLUMN EDITORIAL GRID
            ===================================================================== */}
        {screenState === "ready" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* -----------------------------------------------------------------
                LEFT 7 COLS: "NEXT REEL" HERO SPREAD
                ----------------------------------------------------------------- */}
            <section className="lg:col-span-7 space-y-4">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-primary">
                    Next reel
                  </h3>
                  <Badge variant="moss">{currentReel.slot}</Badge>
                </div>
                <span className="font-mono tabular-nums text-xs text-ink-muted">
                  {currentReel.scheduledTime}
                </span>
              </div>

              {/* Main Reel Presentation Card */}
              <Card className="p-5 sm:p-6 bg-surface">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
                  {/* 9:16 Video Player (max-w-[360px]) */}
                  <div className="sm:col-span-6 lg:col-span-5 flex flex-col items-start">
                    <div className="w-full max-w-[360px]">
                      <HeroPlayer
                        videoSrc={currentReel.videoSrc}
                        posterSrc={currentReel.posterSrc}
                        duration={currentReel.duration}
                        status={reelStatus}
                      />
                    </div>
                    <span className="font-mono text-xs text-ink-muted mt-2 text-left block">
                      Hover to preview · Click for audio
                    </span>
                  </div>

                  {/* Beside Player: Quote in Serif, Caption, Meta, Actions */}
                  <div className="sm:col-span-6 lg:col-span-7 flex flex-col justify-between space-y-5">
                    {/* Serif Quote with Optical Hanging Punctuation */}
                    <div className="space-y-2">
                      <span className="font-mono text-xs uppercase tracking-wider text-moss font-medium">
                        Quote (Formula D3 · Roman Urdu)
                      </span>
                      <QuoteBlock size="md" theme="loss">
                        {currentReel.quote}
                      </QuoteBlock>
                    </div>

                    {/* Instagram Caption Block */}
                    <div className="p-3.5 rounded-sm bg-subtle border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                          Instagram Caption
                        </span>
                        <span className="font-mono tabular-nums text-xs text-ink-muted">
                          {currentReel.caption.length} chars
                        </span>
                      </div>
                      <p className="font-sans text-xs text-ink-secondary leading-relaxed whitespace-pre-line italic">
                        {currentReel.caption}
                      </p>
                    </div>

                    {/* Meta Specifications */}
                    <div className="divide-y divide-border border-y border-border py-1 text-xs font-mono">
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-ink-muted">Clip Name</span>
                        <span className="text-ink-primary truncate max-w-[190px] text-right" title={currentReel.clipName}>
                          {currentReel.clipName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-ink-muted">Style</span>
                        <span className="text-ink-primary font-medium">{currentReel.style}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-ink-muted">Scheduled Time</span>
                        <span className="text-ink-primary tabular-nums">18:00 UTC (Slot A)</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-ink-muted">Format</span>
                        <span className="text-ink-primary tabular-nums">{currentReel.resolution}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-ink-muted">Placement</span>
                        <span className="text-moss font-medium">{currentReel.placementBand}</span>
                      </div>
                    </div>

                    {/* Approve / Regenerate Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<Check className="w-3.5 h-3.5" />}
                        onClick={handleApprove}
                      >
                        Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<RefreshCw className="w-3.5 h-3.5" />}
                        onClick={handleRegenerate}
                      >
                        Regenerate
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Send className="w-3.5 h-3.5" />}
                        onClick={handlePublishNow}
                      >
                        Publish Now
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setReelStatus("discarded");
                          addToast({
                            type: "info",
                            title: "Reel Discarded",
                            description: "Moved to output/_rejected.",
                          });
                        }}
                      >
                        Discard
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* -----------------------------------------------------------------
                RIGHT 5 COLS: "PIPELINE" TIMELINE & "THIS WEEK" STATS
                ----------------------------------------------------------------- */}
            <aside className="lg:col-span-5 space-y-6">
              {/* 1. Pipeline Vertical Timeline */}
              <Card className="p-5 bg-surface space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="space-y-0.5">
                    <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-primary">
                      Pipeline
                    </h3>
                    <p className="font-mono text-[10px] text-ink-muted">
                      Today's automated production timeline
                    </p>
                  </div>
                  <Badge variant="default">Auto 60fps</Badge>
                </div>

                {/* Vertical Timeline with Thin 1px Rule and Status Dots */}
                <div className="relative pl-6 space-y-4">
                  {/* Vertical Thin Rule */}
                  <div
                    className="absolute left-[7px] top-1.5 bottom-2 w-px bg-border"
                    aria-hidden="true"
                  />

                  {PIPELINE_STEPS.map((step, idx) => {
                    const isCompleted = step.status === "completed";
                    const isActive = step.status === "active";

                    return (
                      <div key={step.name} className="relative flex items-start gap-3">
                        {/* 6px Status Dot centered on timeline */}
                        <div
                          className="absolute -left-6 top-1 flex items-center justify-center w-3.5 h-3.5 bg-surface rounded-full"
                          aria-hidden="true"
                        >
                          <StatusDot
                            status={
                              isCompleted
                                ? "success"
                                : isActive
                                ? "warning"
                                : "neutral"
                            }
                            pulse={isActive}
                          />
                        </div>

                        {/* Step Details */}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <span
                              className={`font-sans font-medium ${
                                isCompleted
                                  ? "text-ink-primary"
                                  : isActive
                                  ? "text-moss font-semibold"
                                  : "text-ink-muted"
                              }`}
                            >
                              {step.name}
                            </span>
                            <span className="font-mono tabular-nums text-[10px] text-ink-muted">
                              {step.timestamp}
                            </span>
                          </div>
                          <p className="font-mono text-[11px] text-ink-secondary leading-tight truncate">
                            {step.detail}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* 2. Compact "This week" List with Tabular Numerals */}
              <Card className="p-5 bg-surface space-y-3.5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="space-y-0.5">
                    <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-primary">
                      This week
                    </h3>
                    <p className="font-mono text-xs text-ink-muted">
                      Cadence: 2 reels/day (@enoent.7)
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-border text-xs font-mono space-y-0">
                  {/* Posts Scheduled */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-ink-secondary font-sans">Posts</span>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-medium text-ink-primary">
                        12 / 14
                      </span>
                      <span className="text-xs font-mono text-moss bg-moss-subtle px-1.5 py-0.5 rounded-xs border border-moss/20 font-medium">
                        85%
                      </span>
                    </div>
                  </div>

                  {/* Success Rate */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-ink-secondary font-sans">Success rate</span>
                    <span className="tabular-nums font-medium text-status-success">
                      98.4%
                    </span>
                  </div>

                  {/* Token Health */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-ink-secondary font-sans">Token expires in</span>
                    <span className="tabular-nums font-medium text-ink-primary">
                      58 days
                    </span>
                  </div>

                  {/* Contrast Score */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-ink-secondary font-sans">Avg contrast</span>
                    <span className="tabular-nums font-medium text-ink-primary">
                      0.23 (Safe AA)
                    </span>
                  </div>

                  {/* Audio Gate Compliance */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-ink-secondary font-sans">Audio gate</span>
                    <span className="tabular-nums text-ink-secondary text-xs">
                      &lt; 90 BPM (100%)
                    </span>
                  </div>
                </div>
              </Card>
            </aside>
          </div>
        )}
      </div>

      {/* GENERATE BATCH DIALOG */}
      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent title="Generate Reel" description="Trigger the autonomous D3 production pipeline.">
          <div className="space-y-4 py-2 text-xs font-sans text-ink-secondary">
            <p>
              This will discover a fresh Pinterest nature video, generate Roman Urdu sad lines with Gemini Flash,
              apply the middle-centre placement lock, adaptive grade, 60fps lanczos upscale, and stage the reel deliverable.
            </p>

            <div className="p-3 rounded-sm bg-subtle border border-border font-mono text-[11px] space-y-1">
              <p><span className="text-ink-muted">Slot:</span> Slot A (08:30 PKT) / Slot B (16:00 PKT)</p>
              <p><span className="text-ink-muted">Destination:</span> swap/ready_to_post/reel_YYYY-MM-DD_a.mp4</p>
              <p><span className="text-ink-muted">Channel:</span> @enoent.7 via Buffer 'noori.shed'</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsGenerateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={() => {
                setIsGenerateModalOpen(false);
                addToast({
                  type: "info",
                  title: "D3 Pipeline Started",
                  description: "Generating slot deliverable in background...",
                });
              }}
            >
              Start Build
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
