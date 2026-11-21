"use client";

import * as React from "react";
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  Check,
  Film,
  Plus,
  GripVertical,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Send,
} from "lucide-react";

import {
  AppShell,
  Button,
  Badge,
  StatusDot,
  Card,
  Switch,
  Dialog,
  DialogContent,
  DialogFooter,
  ToastProvider,
  useToast,
  TooltipProvider,
} from "@/components";
import { cn } from "@/lib/utils";

interface ScheduledReel {
  id: string;
  dayId: string; // e.g. "2026-11-21"
  slot: "slot_a" | "slot_b";
  slotLabel: string;
  time: string;
  quoteSnippet: string;
  theme: string;
  clipName: string;
  posterSrc: string;
  videoSrc: string;
  status: "published" | "scheduled" | "ready";
}

interface DayColumn {
  id: string; // "2026-11-21"
  dayName: string; // "Fri"
  dayNumber: number; // 21
  dateString: string; // "21 Nov"
  isToday: boolean;
  cap: number; // 2
}

const WEEK_DAYS: DayColumn[] = [
  { id: "2026-11-17", dayName: "Mon", dayNumber: 17, dateString: "17 Nov", isToday: false, cap: 2 },
  { id: "2026-11-18", dayName: "Tue", dayNumber: 18, dateString: "18 Nov", isToday: false, cap: 2 },
  { id: "2026-11-19", dayName: "Wed", dayNumber: 19, dateString: "19 Nov", isToday: false, cap: 2 },
  { id: "2026-11-20", dayName: "Thu", dayNumber: 20, dateString: "20 Nov", isToday: false, cap: 2 },
  { id: "2026-11-21", dayName: "Fri", dayNumber: 21, dateString: "21 Nov", isToday: true, cap: 2 },
  { id: "2026-11-22", dayName: "Sat", dayNumber: 22, dateString: "22 Nov", isToday: false, cap: 2 },
  { id: "2026-11-23", dayName: "Sun", dayNumber: 23, dateString: "23 Nov", isToday: false, cap: 2 },
];

const INITIAL_SCHEDULED_REELS: ScheduledReel[] = [
  {
    id: "reel-mon-a",
    dayId: "2026-11-17",
    slot: "slot_a",
    slotLabel: "Slot A · 08:30 PKT",
    time: "08:30 PKT",
    quoteSnippet: "woh jo kabhi jaan hua karte the...",
    theme: "yaadein",
    clipName: "WhatsApp_Video_...16_AM",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    status: "published",
  },
  {
    id: "reel-mon-b",
    dayId: "2026-11-17",
    slot: "slot_b",
    slotLabel: "Slot B · 16:00 PKT",
    time: "16:00 PKT",
    quoteSnippet: "kuch baatein dil mein hi achi lagti hain...",
    theme: "dard",
    clipName: "WhatsApp_Video_...18_AM",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    status: "published",
  },
  {
    id: "reel-tue-a",
    dayId: "2026-11-18",
    slot: "slot_a",
    slotLabel: "Slot A · 08:30 PKT",
    time: "08:30 PKT",
    quoteSnippet: "sab kehte hain akela rehna buri baat hai...",
    theme: "tanhai",
    clipName: "WhatsApp_Video_...21_AM",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    status: "published",
  },
  {
    id: "reel-wed-a",
    dayId: "2026-11-19",
    slot: "slot_a",
    slotLabel: "Slot A · 08:30 PKT",
    time: "08:30 PKT",
    quoteSnippet: "sab kehte hain waqt sab theek kar deta hai...",
    theme: "waqt",
    clipName: "alpine_meadow_dusk_4k",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    status: "published",
  },
  {
    id: "reel-thu-a",
    dayId: "2026-11-20",
    slot: "slot_a",
    slotLabel: "Slot A · 08:30 PKT",
    time: "08:30 PKT",
    quoteSnippet: "Frost coats the glass tonight...",
    theme: "nature",
    clipName: "WhatsApp_Video_...23_AM",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    status: "published",
  },
  {
    id: "reel-thu-b",
    dayId: "2026-11-20",
    slot: "slot_b",
    slotLabel: "Slot B · 16:00 PKT",
    time: "16:00 PKT",
    quoteSnippet: "Quiet solitude upon still waters...",
    theme: "calm",
    clipName: "moody_rain_dark_lake",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    status: "published",
  },
  {
    id: "reel-today-a",
    dayId: "2026-11-21",
    slot: "slot_a",
    slotLabel: "Slot A · 18:00 UTC",
    time: "18:00 UTC (08:30 PKT)",
    quoteSnippet: "toote huye dil ke tukde sambhalte nahi...",
    theme: "loss",
    clipName: "WhatsApp_Video_2026-11-20_at_6.36.16_AM",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    status: "scheduled",
  },
  {
    id: "reel-sat-a",
    dayId: "2026-11-22",
    slot: "slot_a",
    slotLabel: "Slot A · 08:30 PKT",
    time: "08:30 PKT",
    quoteSnippet: "raat gehri ho to yaadein cheekhti hain...",
    theme: "hope-in-sadness",
    clipName: "autumn_leaf_fall_path",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    status: "ready",
  },
  {
    id: "reel-sat-b",
    dayId: "2026-11-22",
    slot: "slot_b",
    slotLabel: "Slot B · 16:00 PKT",
    time: "16:00 PKT",
    quoteSnippet: "umeed ke diye bujhne na dena...",
    theme: "hope",
    clipName: "coastal_cliff_waves_mist",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    status: "ready",
  },
];

export default function SchedulePage() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <ScheduleContent />
      </TooltipProvider>
    </ToastProvider>
  );
}

function ScheduleContent() {
  const { addToast } = useToast();

  const [reels, setReels] = React.useState<ScheduledReel[]>(INITIAL_SCHEDULED_REELS);
  const [viewMode, setViewMode] = React.useState<"week" | "month">("week");

  // Publishing Pause Switch & Confirmation State
  const [isPublishingPaused, setIsPublishingPaused] = React.useState<boolean>(false);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = React.useState<boolean>(false);

  // Drag and drop state
  const [draggedReel, setDraggedReel] = React.useState<ScheduledReel | null>(null);
  const [dragOverDayId, setDragOverDayId] = React.useState<string | null>(null);

  // Drag and Drop Handlers
  const handleDragStart = (reel: ScheduledReel) => {
    setDraggedReel(reel);
  };

  const handleDragOver = (e: React.DragEvent, dayId: string) => {
    e.preventDefault();
    if (dragOverDayId !== dayId) {
      setDragOverDayId(dayId);
    }
  };

  const handleDrop = (targetDayId: string) => {
    if (!draggedReel) return;

    if (draggedReel.dayId === targetDayId) {
      setDraggedReel(null);
      setDragOverDayId(null);
      return;
    }

    // Check target day cap (Formula D3 max 2 reels/day)
    const targetDayReels = reels.filter((r) => r.dayId === targetDayId);
    if (targetDayReels.length >= 2) {
      addToast({
        type: "warning",
        title: "Daily Cap Reached",
        description: `Target day already has ${targetDayReels.length} / 2 reels scheduled. Rescheduling rejected.`,
      });
      setDraggedReel(null);
      setDragOverDayId(null);
      return;
    }

    const nextSlot = targetDayReels.some((r) => r.slot === "slot_a") ? "slot_b" : "slot_a";
    const slotLabel = nextSlot === "slot_a" ? "Slot A · 08:30 PKT" : "Slot B · 16:00 PKT";

    setReels((prev) =>
      prev.map((r) =>
        r.id === draggedReel.id
          ? {
              ...r,
              dayId: targetDayId,
              slot: nextSlot,
              slotLabel,
              status: "scheduled",
            }
          : r
      )
    );

    const targetDay = WEEK_DAYS.find((d) => d.id === targetDayId);
    addToast({
      type: "success",
      title: "Reel Rescheduled",
      description: `Moved "${draggedReel.theme}" to ${targetDay?.dayName} ${targetDay?.dateString} (${slotLabel}).`,
    });

    setDraggedReel(null);
    setDragOverDayId(null);
  };

  // Toggle Pause Switch with Calm Confirmation
  const handlePauseSwitchToggle = (checked: boolean) => {
    if (!checked) {
      // User is trying to pause publishing -> require confirmation dialog
      setIsPauseDialogOpen(true);
    } else {
      // User is resuming publishing -> immediate resume
      setIsPublishingPaused(false);
      addToast({
        type: "success",
        title: "Publishing Resumed",
        description: "Buffer dispatch active for 08:30 PKT and 16:00 PKT slots.",
      });
    }
  };

  const confirmPausePublishing = () => {
    setIsPublishingPaused(true);
    setIsPauseDialogOpen(false);
    addToast({
      type: "warning",
      title: "Automated Publishing Paused",
      description: "Daily releases are suspended. Scheduled reels remain safely staged in queue.",
    });
  };

  return (
    <AppShell title="Schedule" subtitle="Release Cadence & Slot Distribution">
      <div className="space-y-6 pb-12">
        {/* =====================================================================
            1. HEADER / CONTROL BAR: NEXT RUN TIME & CALM PAUSE SWITCH
            ===================================================================== */}
        <div className="p-4 rounded-md bg-surface border border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Next Run Time & Range */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                className="p-1 rounded-sm border border-border bg-subtle hover:bg-surface text-ink-muted hover:text-ink-primary transition-fast"
                aria-label="Previous week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-sans text-xs font-semibold text-ink-primary select-none px-1">
                17 Nov – 23 Nov 2026
              </span>
              <button
                className="p-1 rounded-sm border border-border bg-subtle hover:bg-surface text-ink-muted hover:text-ink-primary transition-fast"
                aria-label="Next week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-border hidden sm:block" />

            {/* Next Run Time Badge */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-moss shrink-0" />
              <span className="text-ink-secondary">
                Next run:{" "}
                <strong className="text-ink-primary font-medium">
                  Today at 18:00 UTC (Slot A)
                </strong>
              </span>
              <span className="text-moss font-medium tabular-nums bg-moss-subtle px-1.5 py-0.2 rounded border border-moss/20">
                in 2h 42m
              </span>
            </div>
          </div>

          {/* Right: Week/Month Toggle + Visible but Calm "Pause all publishing" switch */}
          <div className="flex items-center gap-4 self-end lg:self-auto">
            {/* View Mode Toggle: Week / Month */}
            <div className="flex items-center rounded-sm border border-border bg-subtle p-0.5 text-xs font-mono">
              <button
                onClick={() => setViewMode("week")}
                className={cn(
                  "px-2.5 py-1 rounded-xs transition-fast select-none",
                  viewMode === "week"
                    ? "bg-surface text-ink-primary shadow-xs font-semibold"
                    : "text-ink-muted hover:text-ink-primary"
                )}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode("month")}
                className={cn(
                  "px-2.5 py-1 rounded-xs transition-fast select-none",
                  viewMode === "month"
                    ? "bg-surface text-ink-primary shadow-xs font-semibold"
                    : "text-ink-muted hover:text-ink-primary"
                )}
              >
                Month
              </button>
            </div>

            <div className="h-4 w-px bg-border" />

            {/* Calm "Pause all publishing" Switch */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex flex-col text-right">
                <span className="font-mono text-[11px] text-ink-primary font-medium leading-none">
                  Publishing
                </span>
                <span className="font-mono text-[9px] text-ink-muted flex items-center justify-end gap-1 mt-0.5">
                  <StatusDot status={isPublishingPaused ? "warning" : "success"} />
                  {isPublishingPaused ? "Paused" : "Active"}
                </span>
              </div>
              <Switch
                checked={!isPublishingPaused}
                onCheckedChange={handlePauseSwitchToggle}
                aria-label="Pause all publishing"
              />
            </div>
          </div>
        </div>

        {/* =====================================================================
            2. PAUSED PUBLISHING BANNER (If Paused)
            ===================================================================== */}
        {isPublishingPaused && (
          <div className="p-3.5 rounded-md bg-status-warning/10 border border-status-warning/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-status-warning">
              <PauseCircle className="w-4 h-4 shrink-0" />
              <span className="font-sans font-medium">
                Automated publishing is suspended. Reels will remain staged in queue and will not be dispatched to Buffer.
              </span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setIsPublishingPaused(false);
                addToast({
                  type: "success",
                  title: "Publishing Resumed",
                  description: "Buffer schedule re-activated.",
                });
              }}
            >
              Resume Publishing
            </Button>
          </div>
        )}

        {/* =====================================================================
            3. WEEK VIEW (7 DAY COLUMNS, DRAG TO RESCHEDULE, DAILY CAP)
            ===================================================================== */}
        {viewMode === "week" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-ink-muted px-1">
              <span>Formula D3 Cadence: 2 reels/day (Slot A @ 08:30 PKT · Slot B @ 16:00 PKT)</span>
              <span>Drag any reel card to reschedule slot</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-start">
              {WEEK_DAYS.map((day) => {
                const dayReels = reels.filter((r) => r.dayId === day.id);
                const isDragOver = dragOverDayId === day.id;
                const isFull = dayReels.length >= day.cap;

                return (
                  <div
                    key={day.id}
                    onDragOver={(e) => handleDragOver(e, day.id)}
                    onDrop={() => handleDrop(day.id)}
                    className={cn(
                      "rounded-md border p-2.5 transition-fast flex flex-col gap-2.5 min-h-[460px]",
                      day.isToday
                        ? "bg-surface border-moss/80 shadow-xs"
                        : "bg-surface/70 border-border hover:border-border-strong",
                      isDragOver && "bg-moss-subtle/50 border-dashed border-moss"
                    )}
                  >
                    {/* Day Column Header with Daily Cap */}
                    <div className="pb-2 border-b border-border space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-sans text-xs font-semibold text-ink-primary">
                            {day.dayName}
                          </span>
                          <span className="font-mono text-xs tabular-nums text-ink-secondary">
                            {day.dayNumber}
                          </span>
                        </div>

                        {day.isToday && (
                          <span className="font-mono text-[9px] uppercase tracking-wider text-moss bg-moss-subtle px-1 py-0.2 rounded border border-moss/20 font-semibold">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Daily Cap Shown Per Day (e.g. 2 / 2 reels) */}
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="text-ink-muted">Daily Cap:</span>
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              "tabular-nums font-medium",
                              isFull ? "text-moss" : "text-ink-secondary"
                            )}
                          >
                            {dayReels.length} / {day.cap}
                          </span>
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isFull
                                ? "bg-status-success"
                                : dayReels.length === 1
                                ? "bg-status-warning"
                                : "bg-ink-muted/40"
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Reels Slotted in this Day */}
                    <div className="space-y-2 flex-1">
                      {dayReels.map((reel) => {
                        const isPublished = reel.status === "published";
                        const isScheduled = reel.status === "scheduled";

                        return (
                          <div
                            key={reel.id}
                            draggable={!isPublished}
                            onDragStart={() => handleDragStart(reel)}
                            className={cn(
                              "p-2 rounded-sm border bg-subtle/60 transition-fast flex flex-col gap-2 group select-none relative",
                              !isPublished
                                ? "cursor-grab active:cursor-grabbing hover:border-border-strong hover:bg-subtle"
                                : "opacity-75 cursor-default border-border"
                            )}
                          >
                            {/* Slot header */}
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="font-medium text-ink-primary truncate">
                                {reel.slotLabel.split(" · ")[0]}
                              </span>
                              <div className="flex items-center gap-1">
                                {!isPublished && (
                                  <GripVertical className="w-3 h-3 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                                <span
                                  className={cn(
                                    "px-1 py-0.2 rounded text-[9px] font-mono uppercase",
                                    isPublished
                                      ? "bg-surface text-ink-muted border border-border"
                                      : isScheduled
                                      ? "bg-moss-subtle text-moss border border-moss/20 font-semibold"
                                      : "bg-surface text-ink-secondary border border-border"
                                  )}
                                >
                                  {reel.status}
                                </span>
                              </div>
                            </div>

                            {/* 9:16 Miniature Thumbnail Preview */}
                            <div className="relative aspect-[9/16] w-full rounded-xs overflow-hidden bg-ink-primary border border-border shrink-0">
                              <img
                                src={reel.posterSrc}
                                alt="Reel frame"
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-1 right-1 font-mono text-[8px] bg-ink-primary/80 text-white px-1 rounded-xs">
                                {reel.time}
                              </span>
                            </div>

                            {/* First line quote */}
                            <p className="font-serif italic text-[11px] text-ink-primary line-clamp-2 leading-snug">
                              “{reel.quoteSnippet}”
                            </p>

                            <div className="flex items-center justify-between text-[9px] font-mono text-ink-muted pt-1 border-t border-border/70">
                              <span className="truncate max-w-[80px]">#{reel.theme}</span>
                              <span className="text-moss">1080p60</span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Empty Slot Placeholder if under cap */}
                      {dayReels.length < day.cap && (
                        <div
                          className="h-28 rounded-sm border border-dashed border-border flex flex-col items-center justify-center p-2 text-center text-ink-muted text-xs hover:border-moss/40 hover:bg-subtle/30 transition-fast cursor-pointer"
                          onClick={() => {
                            addToast({
                              type: "info",
                              title: "Assign Reel",
                              description: `Select a staged reel from Review to fill Slot ${
                                dayReels.length === 0 ? "A" : "B"
                              } on ${day.dayName} ${day.dateString}.`,
                            });
                          }}
                        >
                          <Plus className="w-3.5 h-3.5 mb-1 text-ink-muted" />
                          <span className="font-mono text-[10px]">
                            Empty Slot {dayReels.length === 0 ? "A" : "B"}
                          </span>
                          <span className="font-sans text-[9px] text-ink-muted/70">
                            Drop reel here
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* =====================================================================
              4. MONTH CALENDAR VIEW TOGGLE
              ===================================================================== */
          <Card className="p-6 bg-surface space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-primary">
                November 2026 Monthly Distribution
              </h3>
              <span className="font-mono text-xs text-ink-muted">
                14 / 14 Slots Filled This Fortnight
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 text-xs font-mono">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="p-2 text-center text-ink-muted uppercase font-medium">
                  {d}
                </div>
              ))}

              {Array.from({ length: 30 }).map((_, i) => {
                const dayNum = i + 1;
                const isCurrent = dayNum === 21;
                const hasReels = dayNum <= 22;

                return (
                  <div
                    key={dayNum}
                    onClick={() => {
                      setViewMode("week");
                      addToast({
                        type: "info",
                        title: "Switched to Week View",
                        description: `Focused on week containing Nov ${dayNum}.`,
                      });
                    }}
                    className={cn(
                      "aspect-square p-2 rounded-sm border transition-fast flex flex-col justify-between cursor-pointer",
                      isCurrent
                        ? "bg-moss-subtle border-moss text-moss font-bold"
                        : "bg-subtle/40 border-border hover:bg-subtle hover:border-border-strong text-ink-secondary"
                    )}
                  >
                    <span className="tabular-nums">{dayNum}</span>

                    {hasReels ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-moss">2/2</span>
                        <div className="flex gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                          <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                        </div>
                      </div>
                    ) : (
                      <span className="text-[9px] text-ink-muted">0/2</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* =====================================================================
            5. PAUSE CONFIRMATION DIALOG
            ===================================================================== */}
        <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
          <DialogContent
            title="Pause All Automated Publishing?"
            description="Suspending the automated release schedule."
          >
            <div className="space-y-3 py-2 text-xs font-sans text-ink-secondary">
              <p>
                This will halt automated publishing for both daily release slots (08:30 PKT and 16:00 PKT)
                to Buffer channel <code className="font-mono text-ink-primary">noori.shed</code> (@enoent.7).
              </p>
              <div className="p-3 rounded-sm bg-subtle border border-border font-mono text-[11px] space-y-1 text-ink-secondary">
                <p>• Staged reels in <code className="text-moss">swap/ready_to_post/</code> will remain untouched.</p>
                <p>• No posts will be deleted from your queue.</p>
                <p>• You can resume publishing at any time with one click.</p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPauseDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmPausePublishing}
              >
                Confirm Pause
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

