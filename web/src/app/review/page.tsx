"use client";

import * as React from "react";
import {
  Check,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ShieldCheck,
  ArrowDown,
  ArrowUp,
  Sparkles,
  Command,
  Film,
  Music,
  Maximize2,
  Sliders,
  AlertCircle,
} from "lucide-react";

import {
  AppShell,
  Button,
  Badge,
  StatusDot,
  Card,
  Input,
  Textarea,
  ToastProvider,
  useToast,
  TooltipProvider,
  QuoteBlock,
} from "@/components";
import { cn } from "@/lib/utils";

interface WaitingReel {
  id: string;
  slot: string;
  scheduledTime: string;
  clipName: string;
  style: string;
  theme: string;
  song: string;
  bpm: number;
  quote: string;
  caption: string;
  hashtags: string[];
  videoSrc: string;
  posterSrc: string;
  duration: number;
  contrastScore: number;
  luma: number;
  status: "pending_review" | "approved" | "discarded";
}

const INITIAL_WAITING_REELS: WaitingReel[] = [
  {
    id: "reel-001",
    slot: "Slot A",
    scheduledTime: "Today, 18:00 UTC",
    clipName: "WhatsApp_Video_2026-11-20_at_6.36.16_AM.mp4",
    style: "d3_roman_urdu",
    theme: "Loss & Yaadein",
    song: "Dil Ki Khamoshi - alonesinghkdm",
    bpm: 80.7,
    quote: "toote huye dil ke tukde sambhalte nahi,\naur log puchte hain tum badal kyu gaye.",
    caption:
      "toote huye dil ke tukde sambhalte nahi,\naur log puchte hain tum badal kyu gaye.\n\n#sad #dard #tanhai",
    hashtags: ["#sad", "#dard", "#tanhai"],
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
    duration: 5.42,
    contrastScore: 0.22,
    luma: 0.19,
    status: "pending_review",
  },
  {
    id: "reel-002",
    slot: "Slot B",
    scheduledTime: "Tomorrow, 08:30 PKT",
    clipName: "WhatsApp_Video_2026-11-20_at_6.36.18_AM.mp4",
    style: "d3_roman_urdu",
    theme: "Tanhai",
    song: "Tanhai Beats - sad_lofi_urdu",
    bpm: 78.4,
    quote: "sab kehte hain akela rehna buri baat hai,\npar bheed mein bhi to main akela hi tha.",
    caption:
      "sab kehte hain akela rehna buri baat hai,\npar bheed mein bhi to main akela hi tha.\n\n#urdupoetry #tanhai #sadreel",
    hashtags: ["#urdupoetry", "#tanhai", "#sadreel"],
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
    duration: 6.1,
    contrastScore: 0.26,
    luma: 0.21,
    status: "pending_review",
  },
  {
    id: "reel-003",
    slot: "Slot A (Next)",
    scheduledTime: "Tomorrow, 16:00 PKT",
    clipName: "WhatsApp_Video_2026-11-20_at_6.36.21_AM.mp4",
    style: "d3_roman_urdu",
    theme: "Waqt",
    song: "Khamosh Dhun - slow_ambient",
    bpm: 72.0,
    quote: "sab kehte hain waqt sab theek kar deta hai,\nmera waqt to bas yaadein de gaya.",
    caption:
      "sab kehte hain waqt sab theek kar deta hai,\nmera waqt to bas yaadein de gaya.\n\n#waqt #yaadein #sad",
    hashtags: ["#waqt", "#yaadein", "#sad"],
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
    duration: 5.8,
    contrastScore: 0.24,
    luma: 0.18,
    status: "pending_review",
  },
];

export default function ReviewPage() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <ReviewContent />
      </TooltipProvider>
    </ToastProvider>
  );
}

function ReviewContent() {
  const { addToast } = useToast();

  const [reels, setReels] = React.useState<WaitingReel[]>(INITIAL_WAITING_REELS);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(0);

  // Active editable form fields
  const activeReel = reels[selectedIndex] || reels[0];
  const [editableQuote, setEditableQuote] = React.useState(activeReel?.quote || "");
  const [editableCaption, setEditableCaption] = React.useState(activeReel?.caption || "");

  // Video playback state
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Update local form state whenever selection changes
  const activeReelId = activeReel?.id;
  const activeReelQuote = activeReel?.quote;
  const activeReelCaption = activeReel?.caption;

  React.useEffect(() => {
    if (activeReelId && activeReelQuote !== undefined && activeReelCaption !== undefined) {
      setEditableQuote(activeReelQuote);
      setEditableCaption(activeReelCaption);
      setIsPlaying(false);
      setCurrentTime(0);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.pause();
      }
    }
  }, [activeReelId, activeReelQuote, activeReelCaption]);

  // Handle Approve
  const handleApprove = React.useCallback(() => {
    if (!activeReel) return;
    const approvedReel = { ...activeReel, quote: editableQuote, caption: editableCaption };

    setReels((prev) => prev.filter((r) => r.id !== approvedReel.id));
    setSelectedIndex((prev) => Math.max(0, Math.min(prev, reels.length - 2)));

    addToast({
      type: "success",
      title: "Reel Approved",
      description: `${approvedReel.slot} scheduled for publication at ${approvedReel.scheduledTime}.`,
    });
  }, [activeReel, editableQuote, editableCaption, reels.length, addToast]);

  // Handle Discard with Toast + Undo (destructive action, NO modal)
  const handleDiscard = React.useCallback(() => {
    if (!activeReel) return;
    const discardedReel = activeReel;
    const originalIndex = selectedIndex;

    // Immediately remove from review list
    setReels((prev) => prev.filter((r) => r.id !== discardedReel.id));
    setSelectedIndex((prev) => Math.max(0, Math.min(prev, reels.length - 2)));

    // Offer inline Undo button in Toast
    addToast({
      type: "info",
      title: "Reel Discarded",
      description: `Moved "${discardedReel.clipName}" to rejected.`,
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          setReels((prev) => {
            const copy = [...prev];
            copy.splice(originalIndex, 0, discardedReel);
            return copy;
          });
          setSelectedIndex(originalIndex);
          addToast({
            type: "success",
            title: "Discard Undone",
            description: "Reel restored to review queue.",
          });
        },
      },
    });
  }, [activeReel, selectedIndex, reels.length, addToast]);

  // Handle Regenerate
  const handleRegenerate = React.useCallback(() => {
    if (!activeReel) return;
    addToast({
      type: "info",
      title: "Regenerating Background Clip",
      description: "Selecting next verified Pinterest nature clip while keeping quote...",
    });

    setTimeout(() => {
      setReels((prev) =>
        prev.map((r) =>
          r.id === activeReel.id
            ? {
                ...r,
                clipName: "WhatsApp_Video_2026-11-20_at_6.36.23_AM.mp4",
                contrastScore: 0.25,
              }
            : r
        )
      );
      addToast({
        type: "success",
        title: "Regeneration Finished",
        description: "New background clip matched and verified at 60fps.",
      });
    }, 1200);
  }, [activeReel, addToast]);

  // Handle Keyboard Navigation (J / K)
  const handleNext = React.useCallback(() => {
    if (selectedIndex < reels.length - 1) {
      setSelectedIndex((prev) => prev + 1);
    }
  }, [selectedIndex, reels.length]);

  const handlePrev = React.useCallback(() => {
    if (selectedIndex > 0) {
      setSelectedIndex((prev) => prev - 1);
    }
  }, [selectedIndex]);

  // Global Keyboard Shortcuts Listener (A, X, R, J, K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "a") {
        e.preventDefault();
        handleApprove();
      } else if (key === "x") {
        e.preventDefault();
        handleDiscard();
      } else if (key === "r") {
        e.preventDefault();
        handleRegenerate();
      } else if (key === "j") {
        e.preventDefault();
        handleNext();
      } else if (key === "k") {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleApprove, handleDiscard, handleRegenerate, handleNext, handlePrev]);

  // Playback toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <AppShell title="Review" subtitle="Reel Curation & Staging Queue">
      <div className="space-y-4">
        {/* Top Action & Shortcut Helper Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md bg-surface border border-border">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
              Shortcuts:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-ink-secondary">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-subtle border border-border">
                <kbd className="font-semibold text-ink-primary">A</kbd> Approve
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-subtle border border-border">
                <kbd className="font-semibold text-ink-primary">X</kbd> Discard (Undoable)
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-subtle border border-border">
                <kbd className="font-semibold text-ink-primary">R</kbd> Regenerate
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-subtle border border-border">
                <kbd className="font-semibold text-ink-primary">J</kbd>/<kbd className="font-semibold text-ink-primary">K</kbd> Navigate
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-ink-muted">
            <span className="tabular-nums font-medium text-ink-primary">
              {reels.length}
            </span>{" "}
            reels waiting
          </div>
        </div>

        {/* =====================================================================
            TWO-PANE LAYOUT
            ===================================================================== */}
        {reels.length === 0 ? (
          <Card className="p-16 text-center bg-surface">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-10 h-10 rounded-full bg-moss-subtle text-moss mx-auto flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg text-ink-primary">
                All Reels Reviewed
              </h3>
              <p className="font-sans text-xs text-ink-secondary leading-relaxed">
                The waiting queue is clear. Today&apos;s slots have been approved or discarded.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReels(INITIAL_WAITING_REELS)}
              >
                Reset Demo Queue
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* =================================================================
                LEFT PANE: List of reels waiting (Thumbnail, Quote 1st line, Time)
                ================================================================= */}
            <aside className="lg:col-span-4 space-y-2">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                  Queue ({reels.length})
                </span>
                <span className="font-mono text-[10px] text-ink-muted">
                  Select or press J/K
                </span>
              </div>

              <div className="space-y-2 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
                {reels.map((reel, index) => {
                  const isSelected = index === selectedIndex;
                  const firstLine = reel.quote.split("\n")[0] || reel.quote;

                  return (
                    <button
                      key={reel.id}
                      onClick={() => setSelectedIndex(index)}
                      className={cn(
                        "w-full text-left p-3 rounded-md border transition-fast flex items-start gap-3 select-none relative outline-none focus-visible:ring-2 focus-visible:ring-moss/40",
                        isSelected
                          ? "bg-surface border-moss before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-moss before:rounded-r"
                          : "bg-surface/70 border-border hover:bg-surface hover:border-border-strong text-ink-secondary"
                      )}
                    >
                      {/* 9:16 Miniature Thumbnail */}
                      <div className="relative aspect-[9/16] w-12 rounded-sm overflow-hidden bg-ink-primary/10 border border-border shrink-0">
                        {reel.posterSrc ? (
                          <img
                            src={reel.posterSrc}
                            alt="Reel thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-subtle flex items-center justify-center text-ink-muted">
                            <Film className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="absolute bottom-0.5 right-0.5 font-mono tabular-nums text-[8px] bg-ink-primary/80 text-white px-1 rounded-xs">
                          {reel.duration}s
                        </span>
                      </div>

                      {/* Summary Meta */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-moss font-semibold">
                            {reel.slot}
                          </span>
                          <span className="font-mono tabular-nums text-[10px] text-ink-muted">
                            {reel.scheduledTime.split(", ")[1] || reel.scheduledTime}
                          </span>
                        </div>

                        {/* First Line of Quote */}
                        <p className="font-serif italic text-xs text-ink-primary line-clamp-2 leading-snug">
                          “{firstLine}”
                        </p>

                        <div className="flex items-center gap-2 pt-0.5 text-[10px] font-mono text-ink-muted">
                          <span>{reel.theme}</span>
                          <span>•</span>
                          <span className="text-status-success font-medium">
                            {reel.contrastScore} AA
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* =================================================================
                RIGHT PANE: Large player, Live Preview over video, Editable inputs, Meta
                ================================================================= */}
            <main className="lg:col-span-8 space-y-6">
              <Card className="p-5 sm:p-6 bg-surface space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* 1. Large 9:16 Player with LIVE OVERLAY PREVIEW */}
                  <div className="md:col-span-5 flex flex-col items-center">
                    <div className="relative aspect-[9/16] w-full max-w-[340px] rounded-md overflow-hidden bg-ink-primary border border-border group">
                      {/* Video Element */}
                      <video
                        ref={videoRef}
                        src={activeReel.videoSrc}
                        poster={activeReel.posterSrc}
                        className="w-full h-full object-cover"
                        loop
                        playsInline
                        muted={isMuted}
                        onClick={togglePlay}
                        onTimeUpdate={() => {
                          if (videoRef.current) {
                            setCurrentTime(videoRef.current.currentTime);
                          }
                        }}
                      />

                      {/* LIVE TEXT OVERLAY PREVIEW (Middle-Centre Placement Lock) */}
                      <div
                        onClick={togglePlay}
                        className="absolute inset-x-4 top-[50%] -translate-y-1/2 flex flex-col items-center justify-center text-center pointer-events-none select-none z-10"
                      >
                        <p
                          className="font-serif font-semibold text-white tracking-normal leading-[1.35] whitespace-pre-line text-sm sm:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
                          style={{
                            textShadow: "0 2px 4px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.8)",
                          }}
                        >
                          {editableQuote || "(Quote will appear here)"}
                        </p>
                      </div>

                      {/* Play/Pause Center Indicator on Pause */}
                      {!isPlaying && (
                        <div
                          onClick={togglePlay}
                          className="absolute inset-0 flex items-center justify-center bg-ink-primary/20 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-surface/90 border border-border text-ink-primary flex items-center justify-center">
                            <Play className="w-4 h-4 ml-0.5 text-moss" />
                          </div>
                        </div>
                      )}

                      {/* Minimal Overlay Controls Bar */}
                      <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-ink-primary/80 to-transparent flex items-center justify-between text-white text-[11px] font-mono z-20">
                        <button
                          onClick={togglePlay}
                          className="hover:text-moss transition-fast p-1"
                          aria-label={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>

                        <span className="tabular-nums">
                          {currentTime.toFixed(1)}s / {activeReel.duration}s
                        </span>

                        <button
                          onClick={() => {
                            if (!videoRef.current) return;
                            videoRef.current.muted = !isMuted;
                            setIsMuted(!isMuted);
                          }}
                          className="hover:text-moss transition-fast p-1"
                          aria-label={isMuted ? "Unmute" : "Mute"}
                        >
                          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <span className="font-mono text-[10px] text-ink-muted mt-2 text-center block">
                      Live preview overlay • Type to edit in real time
                    </span>
                  </div>

                  {/* 2. Editable Quote, Caption, Metadata & Actions */}
                  <div className="md:col-span-7 space-y-4">
                    {/* Header info */}
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="moss">{activeReel.slot}</Badge>
                        <span className="font-mono text-xs text-ink-secondary">
                          {activeReel.scheduledTime}
                        </span>
                      </div>
                      <Badge variant="default">{activeReel.style}</Badge>
                    </div>

                    {/* Editable Quote Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="review-quote-input" className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                          Editable Quote (Burns directly into video)
                        </label>
                        <span className="font-mono text-[10px] text-moss">Live sync</span>
                      </div>
                      <Textarea
                        id="review-quote-input"
                        rows={3}
                        value={editableQuote}
                        onChange={(e) => setEditableQuote(e.target.value)}
                        className="font-serif italic text-sm text-ink-primary resize-none leading-relaxed"
                        placeholder="Enter 2-3 line quote..."
                      />
                    </div>

                    {/* Editable Caption */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="review-caption-input" className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                          Instagram Caption & Hashtags
                        </label>
                        <span className="font-mono tabular-nums text-[10px] text-ink-muted">
                          {editableCaption.length} chars
                        </span>
                      </div>
                      <Textarea
                        id="review-caption-input"
                        rows={4}
                        value={editableCaption}
                        onChange={(e) => setEditableCaption(e.target.value)}
                        className="font-sans text-xs text-ink-secondary resize-none leading-relaxed"
                        placeholder="Enter caption..."
                      />
                    </div>

                    {/* Clip + Style Metadata & Contrast Check Card */}
                    <div className="p-3 rounded-sm bg-subtle border border-border space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-ink-muted">Clip Source</span>
                        <span className="text-ink-primary truncate max-w-[200px]" title={activeReel.clipName}>
                          {activeReel.clipName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-ink-muted">Audio Track</span>
                        <span className="text-ink-primary truncate max-w-[200px]" title={activeReel.song}>
                          {activeReel.song} ({activeReel.bpm} BPM)
                        </span>
                      </div>

                      {/* Contrast Check Result */}
                      <div className="flex items-center justify-between pt-1 border-t border-border">
                        <span className="text-ink-muted flex items-center gap-1.5">
                          <StatusDot status="success" />
                          Contrast Check
                        </span>
                        <span className="text-status-success font-medium tabular-nums">
                          {activeReel.contrastScore} (Optimal WCAG AA)
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-ink-muted">Base Luminance</span>
                        <span className="text-ink-primary tabular-nums">
                          {activeReel.luma} (Pass &lt; 0.62)
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons with Keyboard Badge Indicators */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <Button
                        size="md"
                        variant="primary"
                        icon={<Check className="w-3.5 h-3.5" />}
                        onClick={handleApprove}
                      >
                        <span>Approve</span>
                        <kbd className="ml-1 px-1 py-0.5 rounded bg-black/20 text-[10px] font-mono">
                          A
                        </kbd>
                      </Button>

                      <Button
                        size="md"
                        variant="secondary"
                        icon={<RefreshCw className="w-3.5 h-3.5" />}
                        onClick={handleRegenerate}
                      >
                        <span>Regenerate</span>
                        <kbd className="ml-1 px-1 py-0.5 rounded bg-subtle text-[10px] font-mono text-ink-muted border border-border">
                          R
                        </kbd>
                      </Button>

                      <Button
                        size="md"
                        variant="ghost"
                        icon={<Trash2 className="w-3.5 h-3.5 text-status-error" />}
                        onClick={handleDiscard}
                      >
                        <span className="text-status-error">Discard</span>
                        <kbd className="ml-1 px-1 py-0.5 rounded bg-subtle text-[10px] font-mono text-status-error border border-border">
                          X
                        </kbd>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </main>
          </div>
        )}
      </div>
    </AppShell>
  );
}

