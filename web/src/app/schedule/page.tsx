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

function formatLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekDays(weekOffset: number = 0): { days: DayColumn[]; rangeLabel: string } {
  const days: DayColumn[] = [];
  const now = new Date();
  const todayStr = formatLocalDateStr(now);
  const dayOfWeek = now.getDay();
  const mondayOffset = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) + weekOffset * 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dateStr = formatLocalDateStr(d);
    days.push({
      id: dateStr,
      dayName: dayNames[i],
      dayNumber: d.getDate(),
      dateString: `${d.getDate()} ${monthNames[d.getMonth()]}`,
      isToday: dateStr === todayStr,
      cap: 2,
    });
  }
  const first = days[0];
  const last = days[6];
  const endDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const rangeLabel = `${first.dateString} – ${last.dateString} ${endDate.getFullYear()}`;
  return { days, rangeLabel };
}

function getNextRunCountdown(now: Date): { label: string; remaining: string } {
  const slotA = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0);
  const slotB = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0, 0);
  let target = slotA;
  let label = "Today at 08:30 AM (Slot A)";

  if (now >= slotA && now < slotB) {
    target = slotB;
    label = "Today at 04:00 PM (Slot B)";
  } else if (now >= slotB) {
    target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 30, 0);
    label = "Tomorrow at 08:30 AM (Slot A)";
  }

  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalMins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return { label, remaining: `in ${hrs}h ${mins}m` };
}

const INITIAL_SCHEDULED_REELS: ScheduledReel[] = [];

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
  const [weekOffset, setWeekOffset] = React.useState<number>(0);
  const [monthOffset, setMonthOffset] = React.useState<number>(0);
  const [nowTick, setNowTick] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNowTick(new Date());
    const timer = setInterval(() => setNowTick(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const { days: weekDays, rangeLabel: weekRangeLabel } = React.useMemo(
    () => getWeekDays(weekOffset),
    [weekOffset]
  );

  const nextRun = React.useMemo(
    () => (nowTick ? getNextRunCountdown(nowTick) : { label: "Loading...", remaining: "--" }),
    [nowTick]
  );

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

    const targetDay = weekDays.find((d) => d.id === targetDayId);
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
                onClick={() => viewMode === "week" ? setWeekOffset((w) => w - 1) : setMonthOffset((m) => m - 1)}
                className="p-1 rounded-sm border border-border bg-subtle hover:bg-surface text-ink-muted hover:text-ink-primary transition-fast"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-sans text-xs font-semibold text-ink-primary select-none px-1">
                {viewMode === "week"
                  ? weekRangeLabel
                  : new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
              </span>
              <button
                onClick={() => viewMode === "week" ? setWeekOffset((w) => w + 1) : setMonthOffset((m) => m + 1)}
                className="p-1 rounded-sm border border-border bg-subtle hover:bg-surface text-ink-muted hover:text-ink-primary transition-fast"
                aria-label="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {(weekOffset !== 0 || monthOffset !== 0) && (
                <button
                  onClick={() => {
                    setWeekOffset(0);
                    setMonthOffset(0);
                  }}
                  className="px-2 py-0.5 rounded-xs border border-border bg-subtle hover:bg-surface text-[10px] font-mono text-moss font-medium"
                >
                  Today
                </button>
              )}
            </div>

            <div className="h-4 w-px bg-border hidden sm:block" />

            {/* Next Run Time Badge */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-moss shrink-0" />
              <span className="text-ink-secondary">
                Next run:{" "}
                <strong className="text-ink-primary font-medium">
                  {nextRun.label}
                </strong>
              </span>
              <span className="text-moss font-medium tabular-nums bg-moss-subtle px-1.5 py-0.5 rounded border border-moss/20">
                {nextRun.remaining}
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
                  "px-2.5 py-1 rounded-xs transition-fast select-none outline-none focus-visible:ring-1 focus-visible:ring-moss",
                  viewMode === "week"
                    ? "bg-surface text-ink-primary font-semibold border border-border"
                    : "text-ink-muted hover:text-ink-primary border border-transparent"
                )}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode("month")}
                className={cn(
                  "px-2.5 py-1 rounded-xs transition-fast select-none outline-none focus-visible:ring-1 focus-visible:ring-moss",
                  viewMode === "month"
                    ? "bg-surface text-ink-primary font-semibold border border-border"
                    : "text-ink-muted hover:text-ink-primary border border-transparent"
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
              {weekDays.map((day) => {
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
                        ? "bg-surface border-moss/80"
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
                          <span className="font-mono text-[9px] uppercase tracking-wider text-moss bg-moss-subtle px-1 py-0.5 rounded border border-moss/20 font-semibold">
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
                                    "px-1 py-0.5 rounded text-[9px] font-mono uppercase",
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
              4. DYNAMIC MONTH CALENDAR VIEW TOGGLE
              ===================================================================== */
          (() => {
            const now = new Date();
            const targetMonthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
            const year = targetMonthDate.getFullYear();
            const month = targetMonthDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            // Monday = 0, ..., Sunday = 6
            const startOffset = (targetMonthDate.getDay() + 6) % 7;
            const monthLabel = targetMonthDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            });
            const todayStr = formatLocalDateStr(now);

            return (
              <Card className="p-6 bg-surface space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-primary">
                    {monthLabel} Monthly Distribution
                  </h3>
                  <span className="font-mono text-xs text-ink-muted">
                    {reels.length} Slotted Reels
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2 text-xs font-mono">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="p-2 text-center text-ink-muted uppercase font-medium">
                      {d}
                    </div>
                  ))}

                  {Array.from({ length: startOffset }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="aspect-square p-2 rounded-sm bg-subtle/15 border border-transparent" />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const cellDate = new Date(year, month, dayNum);
                    const cellDateStr = formatLocalDateStr(cellDate);
                    const isCurrent = cellDateStr === todayStr;
                    const dayReels = reels.filter((r) => r.dayId === cellDateStr);

                    return (
                      <div
                        key={cellDateStr}
                        onClick={() => {
                          const diffDays = Math.floor((cellDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          setWeekOffset(Math.round(diffDays / 7));
                          setViewMode("week");
                          addToast({
                            type: "info",
                            title: "Switched to Week View",
                            description: `Focused on week containing ${cellDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`,
                          });
                        }}
                        className={cn(
                          "aspect-square p-2 rounded-sm border transition-fast flex flex-col justify-between cursor-pointer",
                          isCurrent
                            ? "bg-moss-subtle border-moss text-moss font-bold"
                            : "bg-subtle/40 border-border hover:bg-subtle hover:border-border-strong text-ink-secondary"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="tabular-nums">{dayNum}</span>
                          {isCurrent && (
                            <span className="text-[8px] uppercase tracking-wider bg-moss text-white px-1 rounded">
                              Today
                            </span>
                          )}
                        </div>

                        {dayReels.length > 0 ? (
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-moss">{dayReels.length}/2</span>
                            <div className="flex gap-0.5">
                              {dayReels.map((_, idx) => (
                                <span key={idx} className="w-1.5 h-1.5 rounded-full bg-status-success" />
                              ))}
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
            );
          })()
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

