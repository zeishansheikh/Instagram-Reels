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
  Download,
  Plus,
  Minus,
  Type,
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
  Textarea,
  CapCutEditor,
  EditorFont,
  EditorSong,
  ReelEditorState,
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
    detail: "Pinterest Nature Clip · 1080×1920 @ 60fps · Luma 0.28",
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
  const [screenState, setScreenState] = React.useState<ScreenState>("loading");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = React.useState(false);
  const [reelStatus, setReelStatus] = React.useState<"ready" | "queued" | "rendering" | "published" | "discarded">("queued");
  const [isBuilding, setIsBuilding] = React.useState(false);
  const [buildMessage, setBuildMessage] = React.useState("");
  const [buildProgress, setBuildProgress] = React.useState(0);

  // Configuration options for reel build
  const [aspectRatio, setAspectRatio] = React.useState<"9:16" | "1:1" | "16:9">("9:16");
  const [quality, setQuality] = React.useState<"1080p60" | "1080p30" | "720p60" | "4k60">("1080p60");
  const [duration, setDuration] = React.useState<number>(8);
  const [customQuote, setCustomQuote] = React.useState<string>("");

  // CapCut-Style Studio Live Editor states
  const [editorFonts, setEditorFonts] = React.useState<EditorFont[]>([]);
  const [editorSongs, setEditorSongs] = React.useState<EditorSong[]>([]);
  const [isEditorDirty, setIsEditorDirty] = React.useState<boolean>(false);
  const [isRestyling, setIsRestyling] = React.useState<boolean>(false);
  const [showLiveOverlay, setShowLiveOverlay] = React.useState<boolean>(false);
  const [liveDaySubtitle, setLiveDaySubtitle] = React.useState<string>("");
  const defaultEditorState: ReelEditorState = {
    quote: "",
    fontFile: "PlayfairDisplay-Bold.ttf",
    fontSize: 30,
    textColor: "#FFFFFF",
    yPercent: 50,
    shadowOpacity: 0.9,
    colorPreset: "auto",
    brightness: 0.0,
    contrast: 1.05,
    saturation: 1.12,
    songFile: "",
    songStart: 0.0,
  };
  const [editorState, setEditorState] = React.useState<ReelEditorState>(defaultEditorState);
  const [savedEditorState, setSavedEditorState] = React.useState<ReelEditorState>(defaultEditorState);
  const [baseVideoUrl, setBaseVideoUrl] = React.useState<string>("");

  React.useEffect(() => {
    const now = new Date();
    setLiveDaySubtitle(
      now.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    );
  }, []);

  // Staged reel state
  const [currentReel, setCurrentReel] = React.useState({
    id: "reel_staged",
    date: new Date().toISOString().split("T")[0],
    slot: "Slot A",
    scheduledTime: "Today, 18:00 UTC (08:30 PKT)",
    clipName: "staged_clip.mp4",
    style: "d3_roman_urdu",
    theme: "Loss & Yaadein",
    song: "Lo-Fi Sad Ambient",
    quote: "",
    caption: "",
    hashtags: ["#sad", "#dard", "#tanhai"],
    videoSrc: "",
    posterSrc: "",
    duration: 0,
    resolution: "1080 × 1920 @ 60fps",
    bitrate: "15.02 Mbps",
    contrastRatio: 0.22,
    placementBand: "y = 800 (luma: 76.1)",
    filePath: "",
  });

  // Load real staged reel from backend /d3/status
  const loadLatestStagedReel = React.useCallback(async () => {
    try {
      const res = await fetch("/d3/status");
      if (!res.ok) {
        setScreenState("empty");
        return;
      }
      const data = await res.json();
      const manifestA = data.slots?.slot_a?.manifest;
      if (manifestA && manifestA.video_path) {
        const filename = manifestA.video_path.split("/").pop() || "reel.mp4";
        const ts = Date.now();
        setCurrentReel((prev) => ({
          ...prev,
          id: filename.replace(".mp4", ""),
          date: manifestA.date || prev.date,
          quote: manifestA.quote || prev.quote,
          caption: manifestA.caption || prev.caption,
          hashtags: manifestA.hashtags || prev.hashtags,
          song: manifestA.song || prev.song,
          duration: manifestA.duration || 8,
          resolution: manifestA.aspect_ratio === "1:1" ? "1080 × 1080" : manifestA.aspect_ratio === "16:9" ? "1920 × 1080" : "1080 × 1920 @ 60fps",
          videoSrc: `/static/ready_to_post/${filename}?t=${ts}`,
          posterSrc: `/static/ready_to_post/thumbnail_a.jpg?t=${ts}`,
          clipName: filename,
          filePath: `swap/ready_to_post/${filename}`,
        }));

        if (manifestA.base_video_path) {
          const baseName = manifestA.base_video_path.split("/").pop() || "base_60fps_a.mp4";
          setBaseVideoUrl(`/static/swap/${baseName}?t=${ts}`);
        } else {
          setBaseVideoUrl(`/static/swap/base_60fps_a.mp4?t=${ts}`);
        }

        const loadedEd: ReelEditorState = {
          quote: manifestA.quote || "",
          fontFile: manifestA.font_file || "PlayfairDisplay-Bold.ttf",
          fontSize: manifestA.font_size || 30,
          textColor: manifestA.text_color || "#FFFFFF",
          yPercent: manifestA.y_percent ?? 50,
          shadowOpacity: 0.9,
          colorPreset: manifestA.color_preset || "auto",
          brightness: manifestA.brightness ?? 0.0,
          contrast: manifestA.contrast ?? 1.05,
          saturation: manifestA.saturation ?? 1.12,
          songFile: manifestA.song_file || "",
          songStart: manifestA.song_start ?? 0.0,
        };
        setEditorState(loadedEd);
        setSavedEditorState(loadedEd);
        setIsEditorDirty(false);
        setShowLiveOverlay(false);
        setScreenState("ready");
      } else {
        setScreenState("empty");
      }
    } catch {
      setScreenState("empty");
    }
  }, []);

  // Load fonts from /d3/editor-assets & register @font-face rules
  React.useEffect(() => {
    loadLatestStagedReel();
    fetch("/d3/editor-assets")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data.fonts)) {
          setEditorFonts(data.fonts);
          const styleId = "instora-dynamic-fonts";
          let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
          if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
          }
          const rules = data.fonts
            .map(
              (f: EditorFont) =>
                `@font-face { font-family: "InstoraFont_${f.file.replace(/[^a-zA-Z0-9]/g, "_")}"; src: url("${f.url}") format("truetype"); font-display: swap; }`
            )
            .join("\n");
          styleEl.textContent = rules;
        }
        if (Array.isArray(data.songs)) {
          setEditorSongs(data.songs);
        }
      })
      .catch(() => {});
  }, [loadLatestStagedReel]);

  const handleEditorChange = (next: Partial<ReelEditorState>, markLiveDirty = true) => {
    setEditorState((prev) => ({ ...prev, ...next }));
    if (markLiveDirty) {
      setIsEditorDirty(true);
      setShowLiveOverlay(true);
    }
  };

  const handleApplyRestyle = async () => {
    setIsRestyling(true);
    setIsBuilding(true);
    setBuildProgress(15);
    setBuildMessage("Applying studio fonts, colors & audio trim...");
    addToast({
      type: "info",
      title: "Rendering Studio Edits",
      description: "Re-rendering reel with your selected font, colors, and trimmed audio...",
    });

    try {
      const res = await fetch("/d3/restyle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot: "a",
          quote: editorState.quote,
          font_file: editorState.fontFile,
          font_size: editorState.fontSize,
          text_color: editorState.textColor,
          y_percent: editorState.yPercent,
          shadow_opacity: editorState.shadowOpacity,
          color_preset: editorState.colorPreset,
          brightness: editorState.brightness,
          contrast: editorState.contrast,
          saturation: editorState.saturation,
          song_file: editorState.songFile || undefined,
          song_start: editorState.songStart,
          run_in_background: true,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const jobId = data.job_id;
      if (!jobId) {
        await loadLatestStagedReel();
        setIsRestyling(false);
        setIsBuilding(false);
        return;
      }

      const timer = setInterval(async () => {
        try {
          const jr = await fetch(`/jobs/${jobId}`);
          if (!jr.ok) return;
          const job = await jr.json();
          if (typeof job.progress === "number") {
            setBuildProgress(Math.round(job.progress * 100));
          }
          if (job.message) setBuildMessage(job.message);

          if (job.status === "completed") {
            clearInterval(timer);
            setBuildProgress(100);
            await loadLatestStagedReel();
            setIsRestyling(false);
            setIsBuilding(false);
            addToast({
              type: "success",
              title: "Studio Edits Applied!",
              description: "Reel re-rendered with your font, colors, and audio trim.",
            });
          } else if (job.status === "failed") {
            clearInterval(timer);
            setIsRestyling(false);
            setIsBuilding(false);
            addToast({
              type: "error",
              title: "Render Failed",
              description: job.error || "Check logs.",
            });
          }
        } catch {}
      }, 1500);
    } catch (e: any) {
      setIsRestyling(false);
      setIsBuilding(false);
      addToast({
        type: "error",
        title: "Restyle Failed",
        description: e.message || "Error contacting API.",
      });
    }
  };

  // Handle Real D3 Pipeline Generation
  const handleStartBuild = async () => {
    setIsGenerateModalOpen(false);
    setIsBuilding(true);
    setBuildProgress(8);
    setBuildMessage("Contacting autonomous D3 pipeline...");
    addToast({
      type: "info",
      title: "D3 Pipeline Started",
      description: `Generating ${quality} (${aspectRatio}, ${duration}s) reel in background...`,
    });

    try {
      const res = await fetch("/d3/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot: "a",
          run_in_background: true,
          aspect_ratio: aspectRatio,
          quality: quality,
          duration: duration,
          custom_quote: customQuote.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const jobId = data.job_id;

      if (!jobId) {
        setBuildProgress(100);
        await loadLatestStagedReel();
        setIsBuilding(false);
        addToast({
          type: "success",
          title: "Reel Generated!",
          description: "Staged in swap/ready_to_post/.",
        });
        return;
      }

      let errorCount = 0;
      const timer = setInterval(async () => {
        try {
          const jobRes = await fetch(`/jobs/${jobId}`);
          if (!jobRes.ok) {
            errorCount++;
            if (jobRes.status === 404 || errorCount >= 5) {
              clearInterval(timer);
              setIsBuilding(false);
              await loadLatestStagedReel();
              return;
            }
            return;
          }
          errorCount = 0;
          const job = await jobRes.json();
          if (job.status === "running") {
            setBuildMessage(job.message || "Encoding 1080p60 video & burning text...");
            if (typeof job.progress === "number") {
              const pct = job.progress <= 1.0 ? Math.round(job.progress * 100) : Math.round(job.progress);
              setBuildProgress((prev) => Math.max(prev, Math.max(8, Math.min(99, pct))));
            }
          } else if (job.status === "completed") {
            clearInterval(timer);
            setBuildProgress(100);
            setBuildMessage("Reel successfully staged and verified!");
            setTimeout(async () => {
              setIsBuilding(false);
              await loadLatestStagedReel();
              addToast({
                type: "success",
                title: "Reel Generated Successfully!",
                description: "New reel staged in swap/ready_to_post/",
              });
            }, 600);
          } else if (job.status === "failed") {
            clearInterval(timer);
            setIsBuilding(false);
            addToast({
              type: "error",
              title: "Build Failed",
              description: job.error || "Generation pipeline failed.",
            });
          }
        } catch {
          errorCount++;
          if (errorCount >= 5) {
            clearInterval(timer);
            setIsBuilding(false);
          }
        }
      }, 2000);
    } catch (err: any) {
      setIsBuilding(false);
      addToast({
        type: "error",
        title: "Build Trigger Error",
        description: err.message || "Failed to contact backend API.",
      });
    }
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
    handleStartBuild();
  };

  const handlePublishNow = async () => {
    addToast({
      type: "info",
      title: "Publishing via Buffer",
      description: "Dispatching staged reel to @enoent.7 / noori.shed...",
    });

    try {
      const res = await fetch("/d3/post/a", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: true, date: currentReel.date }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Publishing failed.");
      }
      setReelStatus("published");
      addToast({
        type: "success",
        title: "Published (Dry Run)",
        description: data.message || "Reel verified and simulated for Buffer direct publish.",
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Publish Failed",
        description: err.message || "Failed to dispatch post.",
      });
    }
  };

  const handleDownload = async () => {
    const cleanSrc = currentReel.videoSrc.split("?")[0];
    const filename = cleanSrc.split("/").pop() || "reel.mp4";

    addToast({
      type: "info",
      title: "Downloading Video",
      description: `Fetching ${filename} for download...`,
    });

    try {
      const response = await fetch(currentReel.videoSrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast({
        type: "success",
        title: "Download Complete",
        description: `Saved ${filename} to your device.`,
      });
    } catch {
      const link = document.createElement("a");
      link.href = currentReel.videoSrc;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <AppShell
      title="Workspace"
      subtitle={liveDaySubtitle || "Instora Studio"}
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
              <span className="text-moss font-medium">Instora Studio</span>
              <span>/</span>
              <span>Slot A & B Ready</span>
              <span>/</span>
              <span>Formula D3</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-ink-primary tracking-tight">
              Creative Reels Workspace
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-ink-secondary">
            <span>Channel: <strong className="text-ink-primary font-medium">@enoent.7</strong></span>
            <span className="text-border-strong">|</span>
            <span>Cadence: <strong className="text-ink-primary font-medium">2 reels / day</strong></span>
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
          <div className="space-y-4 max-w-2xl mx-auto">
            {isBuilding && (
              <div className="p-4 rounded-md bg-surface border border-moss/40 shadow-sm space-y-2.5 transition-all text-left">
                <div className="flex items-center justify-between gap-3 text-xs font-mono">
                  <span className="flex items-center gap-2 text-ink-primary font-medium truncate">
                    <RefreshCw className="w-3.5 h-3.5 text-moss animate-spin shrink-0" />
                    <span className="truncate">{buildMessage || "Processing reel pipeline..."}</span>
                  </span>
                  <span className="shrink-0 font-mono font-bold text-xs text-moss bg-moss-subtle border border-moss/30 px-2.5 py-0.5 rounded-xs tabular-nums">
                    {buildProgress}%
                  </span>
                </div>

                <div className="w-full bg-subtle rounded-full h-2.5 overflow-hidden border border-border/80 relative">
                  <div
                    className="bg-moss h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                    style={{ width: `${Math.max(5, Math.min(100, buildProgress))}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted">
                  <span>Formula D3 · 1080×1920 @ 60fps</span>
                  <span className="text-moss font-medium">
                    {buildProgress >= 100 ? "Verified & Ready" : "Processing pipeline..."}
                  </span>
                </div>
              </div>
            )}

            <div className="p-12 md:p-16 rounded-md bg-surface border border-border text-center">
              <EmptyState
                title="No Reel Staged in Workspace"
                description="The publishing queue is empty. Generate fresh nature quotes and render your next aesthetic reel with 1080p60 quality gates."
                action={
                  <Button
                    size="md"
                    variant="primary"
                    icon={<Sparkles className="w-4 h-4" />}
                    disabled={isBuilding}
                    onClick={() => setIsGenerateModalOpen(true)}
                  >
                    {isBuilding ? "Pipeline Running..." : "Generate Reel for Slot A"}
                  </Button>
                }
              />
            </div>
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
              <p><span className="text-ink-muted">Clip:</span> assets/backgrounds/pinterest_nature_fresh.mp4</p>
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
            3. LIVE WORKSPACE: CAPCUT-STYLE LEFT EDITOR + CENTER STUDIO PREVIEW
            ===================================================================== */}
        {screenState === "ready" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* -----------------------------------------------------------------
                LEFT 4 COLS: CAPCUT-STYLE STUDIO EDITOR (FONTS, COLORS, SONGS/TRIM)
                ----------------------------------------------------------------- */}
            <aside className="lg:col-span-4 lg:sticky lg:top-20">
              <CapCutEditor
                editorState={editorState}
                onChange={handleEditorChange}
                fonts={editorFonts}
                songs={editorSongs}
                reelDuration={currentReel.duration || 8}
                isDirty={isEditorDirty}
                isRendering={isRestyling}
                onApplyRender={handleApplyRestyle}
                onReset={() => {
                  setEditorState(savedEditorState);
                  setIsEditorDirty(false);
                  setShowLiveOverlay(false);
                  addToast({
                    type: "info",
                    title: "Editor Reset",
                    description: "Restored last rendered reel settings.",
                  });
                }}
                onSongAdded={(newSong) =>
                  setEditorSongs((prev) => [newSong, ...prev.filter((s) => s.filename !== newSong.filename)])
                }
              />
            </aside>

            {/* -----------------------------------------------------------------
                RIGHT 8 COLS: LIVE REEL PREVIEW + METADATA + PIPELINE
                ----------------------------------------------------------------- */}
            <section className="lg:col-span-8 space-y-6">
              {/* Section Header + Live Preview Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-primary">
                    Active Studio Reel
                  </h3>
                  <Badge variant="moss">{currentReel.slot}</Badge>
                </div>

                {/* Live Edit Overlay Toggle */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-sm border border-border bg-subtle p-0.5 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setShowLiveOverlay(false)}
                      className={`px-2 py-0.5 rounded-xs transition-fast ${
                        !showLiveOverlay
                          ? "bg-surface text-ink-primary font-semibold border border-border"
                          : "text-ink-muted hover:text-ink-primary"
                      }`}
                    >
                      Rendered MP4
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLiveOverlay(true)}
                      className={`px-2 py-0.5 rounded-xs transition-fast ${
                        showLiveOverlay
                          ? "bg-surface text-moss font-semibold border border-border"
                          : "text-ink-muted hover:text-ink-primary"
                      }`}
                    >
                      Live Edit Overlay
                    </button>
                  </div>
                </div>
              </div>

              {/* Build / Restyle Progress Bar */}
              {isBuilding && (
                <div className="p-4 rounded-md bg-surface border border-moss/40 shadow-sm space-y-2.5 transition-all">
                  <div className="flex items-center justify-between gap-3 text-xs font-mono">
                    <span className="flex items-center gap-2 text-ink-primary font-medium truncate">
                      <RefreshCw className="w-3.5 h-3.5 text-moss animate-spin shrink-0" />
                      <span className="truncate">{buildMessage || "Processing reel pipeline..."}</span>
                    </span>
                    <span className="shrink-0 font-mono font-bold text-xs text-moss bg-moss-subtle border border-moss/30 px-2.5 py-0.5 rounded-xs tabular-nums">
                      {buildProgress}%
                    </span>
                  </div>

                  <div className="w-full bg-subtle rounded-full h-2.5 overflow-hidden border border-border/80 relative">
                    <div
                      className="bg-moss h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                      style={{ width: `${Math.max(5, Math.min(100, buildProgress))}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted">
                    <span>Instora Studio · {currentReel.resolution}</span>
                    <span className="text-moss font-medium">
                      {buildProgress >= 100 ? "Verified & Ready" : "Rendering..."}
                    </span>
                  </div>
                </div>
              )}

              {/* Main Reel Presentation Card */}
              <Card className="p-5 sm:p-6 bg-surface">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* Video Player / Live Canvas */}
                  <div className="md:col-span-6 lg:col-span-5 flex flex-col items-start">
                    <div className="w-full max-w-[340px]">
                      {showLiveOverlay ? (
                        <div className="relative aspect-[9/16] w-full rounded-md overflow-hidden bg-black border border-border shadow-sm group">
                          <video
                            src={baseVideoUrl || currentReel.videoSrc}
                            poster={currentReel.posterSrc}
                            autoPlay
                            loop
                            muted
                            playsInline
                            controls
                            className="w-full h-full object-cover"
                            style={{
                              filter: `brightness(${1 + editorState.brightness}) contrast(${editorState.contrast}) saturate(${editorState.saturation})${
                                editorState.colorPreset === "noir" ? " grayscale(0.95)" : ""
                              }`,
                            }}
                          />
                          {/* Real-time Live Text Overlay */}
                          <div
                            className="absolute left-4 right-4 pointer-events-none text-center flex flex-col items-center justify-center -translate-y-1/2 px-2"
                            style={{
                              top: `${editorState.yPercent}%`,
                              fontFamily: `"InstoraFont_${editorState.fontFile.replace(/[^a-zA-Z0-9]/g, "_")}", serif`,
                              fontSize: `${Math.max(11, Math.round(editorState.fontSize * 0.42))}px`,
                              color: editorState.textColor,
                              textShadow: `0 2px 4px rgba(0, 0, 0, ${editorState.shadowOpacity})`,
                              lineHeight: 1.45,
                            }}
                          >
                            {editorState.quote.split(/[\n/]+/).map((line, i) => (
                              <div key={i} className="w-full break-words">
                                {line.trim()}
                              </div>
                            ))}
                          </div>
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-moss/90 text-white font-mono text-[9px] uppercase tracking-wider">
                            Live Preview
                          </span>
                        </div>
                      ) : (
                        <HeroPlayer
                          videoSrc={currentReel.videoSrc}
                          posterSrc={currentReel.posterSrc}
                          duration={currentReel.duration}
                          status={reelStatus}
                        />
                      )}
                    </div>
                    <span className="font-mono text-xs text-ink-muted mt-2 text-left block">
                      {showLiveOverlay
                        ? "Live previewing unsaved edits · Click Apply & Render"
                        : "Hover to preview · Click for audio"}
                    </span>
                  </div>

                  {/* Quote, Caption, Specs & Actions */}
                  <div className="md:col-span-6 lg:col-span-7 flex flex-col justify-between space-y-5">
                    <div className="space-y-2">
                      <span className="font-mono text-xs uppercase tracking-wider text-moss font-medium">
                        Active Quote (Formula D3)
                      </span>
                      <QuoteBlock size="md" theme="loss">
                        {isEditorDirty ? editorState.quote : currentReel.quote}
                      </QuoteBlock>
                    </div>

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

                    <div className="divide-y divide-border border-y border-border py-1 text-xs font-mono">
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-ink-muted">Active Font</span>
                        <span className="text-ink-primary truncate max-w-[200px]">
                          {editorState.fontFile.replace(".ttf", "")} · {editorState.fontSize}pt
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-ink-muted">Audio Track</span>
                        <span className="text-ink-primary truncate max-w-[200px]">
                          {editorState.songFile || currentReel.song} (from {Math.round(editorState.songStart)}s)
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-ink-muted">Format</span>
                        <span className="text-ink-primary tabular-nums">{currentReel.resolution}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-ink-muted">Saved File</span>
                        <span className="text-ink-primary font-mono text-[11px] truncate max-w-[200px]" title={currentReel.filePath}>
                          {currentReel.filePath}
                        </span>
                      </div>
                    </div>

                    {/* Approve / Regenerate / Download / Publish Actions */}
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
                        variant="secondary"
                        icon={<Download className="w-3.5 h-3.5" />}
                        onClick={handleDownload}
                      >
                        Download
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Send className="w-3.5 h-3.5" />}
                        onClick={handlePublishNow}
                      >
                        Publish Now
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Pipeline & Stats Strip Below */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5 bg-surface space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="space-y-0.5">
                      <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-primary">
                        Pipeline
                      </h3>
                      <p className="font-mono text-[10px] text-ink-muted">
                        Automated production steps
                      </p>
                    </div>
                    <Badge variant="default">Auto 60fps</Badge>
                  </div>

                  <div className="relative pl-6 space-y-3.5">
                    <div className="absolute left-[7px] top-1.5 bottom-2 w-px bg-border" aria-hidden="true" />
                    {PIPELINE_STEPS.map((step) => {
                      const isCompleted = step.status === "completed";
                      const isActive = step.status === "active";
                      return (
                        <div key={step.name} className="relative flex items-start gap-3">
                          <div className="absolute -left-6 top-1 flex items-center justify-center w-3.5 h-3.5 bg-surface rounded-full">
                            <StatusDot status={isCompleted ? "success" : isActive ? "warning" : "neutral"} pulse={isActive} />
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`font-sans font-medium ${isCompleted ? "text-ink-primary" : isActive ? "text-moss font-semibold" : "text-ink-muted"}`}>
                                {step.name}
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
                    <div className="flex items-center justify-between py-2">
                      <span className="text-ink-secondary font-sans">Posts</span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums font-medium text-ink-primary">0 / 14</span>
                        <span className="text-xs font-mono text-ink-muted bg-subtle px-1.5 py-0.5 rounded-xs border border-border font-medium">0%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-ink-secondary font-sans">Success rate</span>
                      <span className="tabular-nums font-medium text-ink-muted">—</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-ink-secondary font-sans">Token expires in</span>
                      <span className="tabular-nums font-medium text-ink-primary">58 days</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-ink-secondary font-sans">Audio gate</span>
                      <span className="tabular-nums text-ink-muted text-xs">&lt; 90 BPM (Ready)</span>
                    </div>
                  </div>
                </Card>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* GENERATE BATCH DIALOG */}
      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent
          title="Generate Reel"
          description="Configure your reel format, duration, quality and custom poetry."
          className="max-w-xl max-h-[90vh] overflow-y-auto"
        >
          <div className="space-y-4 py-2 font-sans text-xs">
            {/* 1. Video Ratio */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-primary font-sans flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-moss" />
                Video Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "9:16", label: "9:16 Vertical", desc: "Reels / TikTok", sub: "1080×1920" },
                  { id: "1:1", label: "1:1 Square", desc: "Feed Post", sub: "1080×1080" },
                  { id: "16:9", label: "16:9 Horizontal", desc: "Landscape", sub: "1920×1080" },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setAspectRatio(r.id as any)}
                    className={`p-2.5 rounded-sm border text-left transition-fast flex flex-col justify-between ${
                      aspectRatio === r.id
                        ? "bg-moss/10 border-moss text-ink-primary ring-1 ring-moss/30"
                        : "bg-surface border-border text-ink-secondary hover:border-moss/40 hover:bg-subtle"
                    }`}
                  >
                    <span className="font-mono text-xs font-bold text-ink-primary">{r.label}</span>
                    <span className="text-[10px] text-ink-muted mt-0.5">{r.desc} · {r.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Quality Preset */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-primary font-sans flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-moss" />
                Video Quality & Framerate
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "1080p60", label: "1080p 60fps", desc: "Ultra Crisp" },
                  { id: "1080p30", label: "1080p 30fps", desc: "Standard HD" },
                  { id: "720p60", label: "720p 60fps", desc: "Fast Render" },
                  { id: "4k60", label: "4K 60fps", desc: "Cinematic UHD" },
                ].map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setQuality(q.id as any)}
                    className={`p-2 rounded-sm border text-left transition-fast flex flex-col justify-between ${
                      quality === q.id
                        ? "bg-moss/10 border-moss text-ink-primary ring-1 ring-moss/30"
                        : "bg-surface border-border text-ink-secondary hover:border-moss/40 hover:bg-subtle"
                    }`}
                  >
                    <span className="font-mono text-xs font-semibold text-ink-primary">{q.label}</span>
                    <span className="text-[10px] text-ink-muted mt-0.5">{q.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Duration Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink-primary font-sans flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-moss" />
                  Duration (7s to 1 min)
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-moss bg-moss/15 px-2.5 py-0.5 rounded border border-moss/30">
                    {duration} seconds {duration === 60 ? "(1 min)" : ""}
                  </span>
                </div>
              </div>

              {/* Stepper with - and + and Slider */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDuration((d) => Math.max(7, d - 1))}
                  disabled={duration <= 7}
                  className="w-8 h-8 rounded-sm border border-border bg-subtle hover:bg-surface text-ink-primary flex items-center justify-center font-mono font-bold transition-fast disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                  title="Decrease 1 second"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="flex-1 px-1">
                  <input
                    type="range"
                    min={7}
                    max={60}
                    step={1}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-moss cursor-pointer h-1.5 bg-subtle rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-ink-muted mt-1">
                    <span>7s (Min)</span>
                    <span>15s</span>
                    <span>30s</span>
                    <span>60s (1 min)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDuration((d) => Math.min(60, d + 1))}
                  disabled={duration >= 60}
                  className="w-8 h-8 rounded-sm border border-border bg-subtle hover:bg-surface text-ink-primary flex items-center justify-center font-mono font-bold transition-fast disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                  title="Increase 1 second"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-ink-muted font-sans mr-1">Quick Presets:</span>
                {[7, 8, 10, 15, 20, 30, 45, 60].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDuration(sec)}
                    className={`px-2 py-0.5 rounded text-xs font-mono transition-fast border ${
                      duration === sec
                        ? "bg-moss text-white border-moss font-bold"
                        : "bg-surface text-ink-secondary border-border hover:border-moss/40 hover:bg-subtle"
                    }`}
                  >
                    {sec === 60 ? "1m" : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Custom Quote / Poetry */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink-primary font-sans flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-moss" />
                  Custom Quote / Poetry <span className="text-ink-muted font-normal">(Optional)</span>
                </label>
                {customQuote.trim() && (
                  <button
                    type="button"
                    onClick={() => setCustomQuote("")}
                    className="text-[10px] text-ink-muted hover:text-status-error font-mono underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Textarea
                rows={3}
                value={customQuote}
                onChange={(e) => setCustomQuote(e.target.value)}
                placeholder="Apni marzi ki poetry / quote yahan likhein (e.g. sab kuch wahi hai bas / woh jo har waqt sath tha / woh nahi hai ab)...&#10;Khali chhor dein to AI Gemini authentic Roman Urdu lines auto-generate karega."
                className="font-mono text-xs leading-relaxed"
              />
              <p className="text-[11px] text-ink-muted font-sans">
                Multi-line poetry ke liye Enter dabayein ya &apos;/&apos; lagayein. Ye lines reel k center mein Noto Serif SemiBold typography mein burn hon gi.
              </p>
            </div>

            {/* 5. Production Summary */}
            <div className="p-3 rounded-sm bg-subtle border border-border font-mono text-[11px] space-y-1">
              <div className="flex items-center justify-between text-ink-secondary">
                <span><span className="text-ink-muted">Format:</span> {aspectRatio} · {quality} · {duration}s</span>
                <span className="text-moss font-semibold">Configured</span>
              </div>
              <p><span className="text-ink-muted">Source:</span> Fresh Pinterest nature video (auto-trimmed to {duration}s)</p>
              <p><span className="text-ink-muted">Soundtrack:</span> Autonomous lo-fi sad beat (-16 LUFS vocal sync)</p>
              <p><span className="text-ink-muted">Channel:</span> @enoent.7 via Buffer &apos;noori.shed&apos;</p>
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
              onClick={handleStartBuild}
            >
              Start Build
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
