"use client";

import * as React from "react";
import {
  Type,
  Palette,
  Music,
  Play,
  Square,
  Sparkles,
  RotateCcw,
  Plus,
  Scissors,
  Sliders,
  Search,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { cn } from "@/lib/utils";

export interface EditorFont {
  name: string;
  file: string;
  script: string;
  style: string;
  weight: number;
  drawtext_ok: boolean;
  url: string;
}

export interface EditorSong {
  filename: string;
  title: string;
  duration: number;
  url: string;
}

export interface ReelEditorState {
  quote: string;
  fontFile: string;
  fontSize: number;
  textColor: string;
  yPercent: number;
  shadowOpacity: number;
  colorPreset: string;
  brightness: number;
  contrast: number;
  saturation: number;
  songFile: string;
  songStart: number;
}

interface CapCutEditorProps {
  editorState: ReelEditorState;
  onChange: (next: Partial<ReelEditorState>, markLiveDirty?: boolean) => void;
  fonts: EditorFont[];
  songs: EditorSong[];
  reelDuration: number;
  isDirty: boolean;
  isRendering: boolean;
  renderProgress?: number;
  onApplyRender: () => void;
  onReset: () => void;
  onSongAdded: (newSong: EditorSong) => void;
  onPreviewAudioToggle?: (playing: boolean) => void;
}

const COLOR_SWATCHES = [
  { label: "Pure White", value: "#FFFFFF" },
  { label: "Warm Cream", value: "#FDF6E3" },
  { label: "Soft Gold", value: "#FDE68A" },
  { label: "Soft Rose", value: "#FCA5A5" },
  { label: "Ice Blue", value: "#BAE6FD" },
  { label: "Sage Mint", value: "#A7F3D0" },
];

const GRADE_PRESETS = [
  { id: "auto", label: "Auto Calm", b: 0.0, c: 1.05, s: 1.12 },
  { id: "warm_amber", label: "Warm Amber", b: 0.02, c: 1.1, s: 1.22 },
  { id: "moody_cold", label: "Moody Cold", b: -0.04, c: 1.12, s: 0.92 },
  { id: "forest", label: "Deep Forest", b: -0.03, c: 1.08, s: 1.18 },
  { id: "noir", label: "Noir B&W", b: -0.05, c: 1.25, s: 0.05 },
];

function formatTimeSec(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export function CapCutEditor({
  editorState,
  onChange,
  fonts,
  songs,
  reelDuration,
  isDirty,
  isRendering,
  renderProgress = 0,
  onApplyRender,
  onReset,
  onSongAdded,
  onPreviewAudioToggle,
}: CapCutEditorProps) {
  const [activeTab, setActiveTab] = React.useState<"text" | "color" | "audio">("text");
  const [fontFilter, setFontFilter] = React.useState<"all" | "latin" | "urdu">("all");
  const [ytQuery, setYtQuery] = React.useState("");
  const [isFetchingSong, setIsFetchingSong] = React.useState(false);
  const [fetchError, setFetchError] = React.useState("");

  // Live audio trim preview player
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = React.useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = React.useState(0);

  const selectedSong = songs.find((s) => s.filename === editorState.songFile) || songs[0];
  const songDuration = selectedSong?.duration || 60;
  const maxStart = Math.max(0, Math.floor(songDuration - Math.max(5, reelDuration)));

  // Stop audio preview when switching songs or unmounting
  React.useEffect(() => {
    const audioEl = audioRef.current;
    return () => {
      if (audioEl) {
        audioEl.pause();
      }
    };
  }, []);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPreviewPlaying(false);
    }
  }, [editorState.songFile]);

  const toggleAudioTrimPreview = () => {
    const audio = audioRef.current;
    if (!audio || !selectedSong) return;

    if (isPreviewPlaying) {
      audio.pause();
      setIsPreviewPlaying(false);
      onPreviewAudioToggle?.(false);
    } else {
      const seekAndPlay = () => {
        try {
          audio.currentTime = Math.max(0, editorState.songStart);
        } catch {}
        audio.play().catch(() => {});
      };
      if (audio.readyState >= 1) {
        seekAndPlay();
      } else {
        audio.addEventListener("loadedmetadata", seekAndPlay, { once: true });
        audio.load();
      }
      setIsPreviewPlaying(true);
      onPreviewAudioToggle?.(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setPreviewCurrentTime(audio.currentTime);
    if (audio.currentTime >= editorState.songStart + reelDuration) {
      audio.currentTime = editorState.songStart;
    }
  };

  const handleFetchSong = async () => {
    if (!ytQuery.trim() || isFetchingSong) return;
    setIsFetchingSong(true);
    setFetchError("");
    try {
      const res = await fetch("/d3/music/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: ytQuery.trim(), run_in_background: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to fetch track (HTTP ${res.status})`);
      }
      const data = await res.json();

      // Poll background download job to avoid 30s Next.js proxy timeout
      if (data.job_id) {
        const jobId = data.job_id;
        await new Promise<void>((resolve, reject) => {
          let polls = 0;
          const timer = setInterval(async () => {
            polls++;
            if (polls > 75) {
              clearInterval(timer);
              reject(new Error("Song download timed out."));
              return;
            }
            try {
              const jr = await fetch(`/jobs/${jobId}`);
              if (!jr.ok) return;
              const job = await jr.json();
              if (job.status === "completed" && job.result) {
                clearInterval(timer);
                const newSong: EditorSong = job.result;
                onSongAdded(newSong);
                onChange({ songFile: newSong.filename, songStart: 0 }, true);
                setYtQuery("");
                resolve();
              } else if (job.status === "failed") {
                clearInterval(timer);
                reject(new Error(job.error || "YouTube download failed."));
              }
            } catch {}
          }, 1000);
        });
      } else if (data.filename) {
        const newSong: EditorSong = data;
        onSongAdded(newSong);
        onChange({ songFile: newSong.filename, songStart: 0 }, true);
        setYtQuery("");
      }
    } catch (e: any) {
      setFetchError(e.message || "Download failed. Try another YouTube URL or song name.");
    } finally {
      setIsFetchingSong(false);
    }
  };

  const filteredFonts = React.useMemo(() => {
    return fonts.filter((f) => {
      if (f.drawtext_ok === false) return false;
      if (fontFilter === "all") return true;
      return f.script === fontFilter;
    });
  }, [fonts, fontFilter]);

  return (
    <div className="bg-surface border border-border rounded-md overflow-hidden flex flex-col shadow-xs">
      {/* Studio Header */}
      <div className="px-4 py-3 border-b border-border bg-subtle/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-moss" />
          <span className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-primary">
            Studio Editor
          </span>
          {isDirty && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-moss/15 text-moss border border-moss/30 font-semibold">
              Live Preview
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={isRendering}
          className="text-[11px] font-mono text-ink-muted hover:text-ink-primary flex items-center gap-1 transition-fast"
          title="Reset to last rendered settings"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* CapCut-Style 3 Navigation Tabs */}
      <div className="grid grid-cols-3 border-b border-border bg-subtle/30 p-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("text")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 rounded-xs text-xs font-sans font-medium transition-fast",
            activeTab === "text"
              ? "bg-surface text-ink-primary shadow-2xs border border-border"
              : "text-ink-muted hover:text-ink-primary"
          )}
        >
          <Type className="w-3.5 h-3.5 text-moss" />
          <span>Fonts & Text</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("color")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 rounded-xs text-xs font-sans font-medium transition-fast",
            activeTab === "color"
              ? "bg-surface text-ink-primary shadow-2xs border border-border"
              : "text-ink-muted hover:text-ink-primary"
          )}
        >
          <Palette className="w-3.5 h-3.5 text-moss" />
          <span>Colors</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("audio")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 rounded-xs text-xs font-sans font-medium transition-fast",
            activeTab === "audio"
              ? "bg-surface text-ink-primary shadow-2xs border border-border"
              : "text-ink-muted hover:text-ink-primary"
          )}
        >
          <Music className="w-3.5 h-3.5 text-moss" />
          <span>Songs & Trim</span>
        </button>
      </div>

      {/* Tab Panel Body */}
      <div className="p-4 space-y-4 max-h-[540px] overflow-y-auto">
        {/* ======================== TAB 1: FONTS & TEXT ======================== */}
        {activeTab === "text" && (
          <div className="space-y-4">
            {/* Quote Line Editor */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                Quote Text (Live Overlay)
              </label>
              <Textarea
                rows={3}
                value={editorState.quote.replace(/ \/ /g, "\n")}
                onChange={(e) =>
                  onChange({ quote: e.target.value.replace(/\n+/g, " / ") }, true)
                }
                placeholder="Write quote lines..."
                className="font-mono text-xs leading-relaxed"
              />
            </div>

            {/* Font Picker from fonts/ folder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                  Fonts Library ({filteredFonts.length})
                </label>
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  {(["all", "latin", "urdu"] as const).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setFontFilter(sc)}
                      className={cn(
                        "px-1.5 py-0.5 rounded border capitalize",
                        fontFilter === sc
                          ? "bg-moss text-white border-moss"
                          : "bg-subtle text-ink-muted border-border hover:text-ink-primary"
                      )}
                    >
                      {sc}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {filteredFonts.map((font) => {
                  const isSelected = editorState.fontFile === font.file;
                  const familyName = `InstoraFont_${font.file.replace(/[^a-zA-Z0-9]/g, "_")}`;
                  const fontFamilyCss = `"${familyName}", sans-serif`;
                  return (
                    <button
                      key={font.file}
                      type="button"
                      onClick={() => {
                        if (typeof document !== "undefined" && "fonts" in document) {
                          document.fonts.load(`20px "${familyName}"`).catch(() => {});
                        }
                        onChange({ fontFile: font.file }, true);
                      }}
                      className={cn(
                        "p-2 rounded-sm border text-left transition-fast flex items-center justify-between gap-1.5",
                        isSelected
                          ? "bg-moss/10 border-moss text-ink-primary ring-1 ring-moss/30"
                          : "bg-subtle/40 border-border text-ink-secondary hover:bg-subtle hover:border-border-strong"
                      )}
                    >
                      <div className="min-w-0">
                        <p
                          className="text-sm text-ink-primary truncate leading-tight"
                          style={{ fontFamily: fontFamilyCss }}
                        >
                          {font.name}
                        </p>
                        <p
                          className="text-[11px] text-ink-secondary truncate mt-0.5"
                          style={{ fontFamily: fontFamilyCss }}
                        >
                          {font.script === "urdu" ? "خاموشی · AaBb" : "Yaadein · AaBb"}
                        </p>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-moss shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Size & Vertical Position Sliders */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-ink-muted">Font Size</span>
                  <span className="text-ink-primary font-semibold">{editorState.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={24}
                  max={80}
                  step={1}
                  value={editorState.fontSize}
                  onChange={(e) => onChange({ fontSize: Number(e.target.value) }, true)}
                  className="w-full accent-moss cursor-pointer h-1.5 bg-subtle rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-ink-muted">Vertical Position</span>
                  <span className="text-ink-primary font-semibold">{editorState.yPercent}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={80}
                  step={1}
                  value={editorState.yPercent}
                  onChange={(e) => onChange({ yPercent: Number(e.target.value) }, true)}
                  className="w-full accent-moss cursor-pointer h-1.5 bg-subtle rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================== TAB 2: COLORS & FILTERS ======================== */}
        {activeTab === "color" && (
          <div className="space-y-4">
            {/* Text Color Swatches + Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                  Quote Text Color
                </label>
                <span className="font-mono text-[11px] text-ink-primary">{editorState.textColor}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_SWATCHES.map((sw) => (
                  <button
                    key={sw.value}
                    type="button"
                    onClick={() => onChange({ textColor: sw.value }, true)}
                    title={sw.label}
                    className={cn(
                      "w-7 h-7 rounded-full border transition-fast",
                      editorState.textColor.toUpperCase() === sw.value
                        ? "ring-2 ring-moss ring-offset-2 border-moss scale-110"
                        : "border-black/25 hover:scale-105"
                    )}
                    style={{ backgroundColor: sw.value }}
                  />
                ))}
                <label
                  className="w-7 h-7 rounded-full border border-dashed border-border-strong flex items-center justify-center cursor-pointer hover:border-moss text-[10px] font-mono text-ink-muted overflow-hidden relative"
                  title="Custom Color"
                >
                  <Plus className="w-3 h-3" />
                  <input
                    type="color"
                    value={editorState.textColor}
                    onChange={(e) => onChange({ textColor: e.target.value }, true)}
                    className="opacity-0 absolute inset-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Text Shadow Strength */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-ink-muted">Text Shadow</span>
                <span className="text-ink-primary font-semibold">
                  {Math.round(editorState.shadowOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={editorState.shadowOpacity}
                onChange={(e) => onChange({ shadowOpacity: Number(e.target.value) }, true)}
                className="w-full accent-moss cursor-pointer h-1.5 bg-subtle rounded-lg"
              />
            </div>

            {/* Video Grade Presets */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-moss" />
                Video Color Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {GRADE_PRESETS.map((p) => {
                  const active = editorState.colorPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        onChange(
                          {
                            colorPreset: p.id,
                            brightness: p.b,
                            contrast: p.c,
                            saturation: p.s,
                          },
                          true
                        )
                      }
                      className={cn(
                        "px-2 py-1.5 rounded-sm border text-xs font-sans text-left transition-fast",
                        active
                          ? "bg-moss/10 border-moss text-ink-primary font-semibold"
                          : "bg-subtle/40 border-border text-ink-secondary hover:bg-subtle"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fine-Tune Brightness / Contrast / Saturation */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-ink-muted">Brightness</span>
                  <span className="text-ink-primary">{(editorState.brightness * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={-0.3}
                  max={0.3}
                  step={0.02}
                  value={editorState.brightness}
                  onChange={(e) =>
                    onChange({ brightness: Number(e.target.value), colorPreset: "custom" }, true)
                  }
                  className="w-full accent-moss cursor-pointer h-1.5 bg-subtle rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-ink-muted">Contrast</span>
                  <span className="text-ink-primary">{(editorState.contrast * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0.7}
                  max={1.5}
                  step={0.02}
                  value={editorState.contrast}
                  onChange={(e) =>
                    onChange({ contrast: Number(e.target.value), colorPreset: "custom" }, true)
                  }
                  className="w-full accent-moss cursor-pointer h-1.5 bg-subtle rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-ink-muted">Saturation</span>
                  <span className="text-ink-primary">{(editorState.saturation * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.8}
                  step={0.05}
                  value={editorState.saturation}
                  onChange={(e) =>
                    onChange({ saturation: Number(e.target.value), colorPreset: "custom" }, true)
                  }
                  className="w-full accent-moss cursor-pointer h-1.5 bg-subtle rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================== TAB 3: SONGS & TRIMMING ======================== */}
        {activeTab === "audio" && (
          <div className="space-y-4">
            {/* Hidden audio tag for live trim preview */}
            {selectedSong && (
              <audio
                ref={audioRef}
                src={selectedSong.url}
                onTimeUpdate={handleAudioTimeUpdate}
                onEnded={() => setIsPreviewPlaying(false)}
              />
            )}

            {/* Add / Download Song from YouTube */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                Fetch Song from YouTube
              </label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={ytQuery}
                    onChange={(e) => setYtQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFetchSong()}
                    placeholder="Song name or YouTube URL..."
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-surface border border-border rounded-sm focus:border-moss focus:outline-none"
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleFetchSong}
                  disabled={isFetchingSong || !ytQuery.trim()}
                >
                  {isFetchingSong ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
                </Button>
              </div>
              {isFetchingSong && (
                <p className="text-[10px] font-mono text-moss flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Downloading MP3 from YouTube (usually 5-10s)...
                </p>
              )}
              {fetchError && <p className="text-[10px] text-status-error">{fetchError}</p>}
            </div>

            {/* Song Track List */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted">
                Available Soundtracks ({songs.length})
              </label>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {songs.map((song) => {
                  const isSelected = editorState.songFile === song.filename;
                  return (
                    <button
                      key={song.filename}
                      type="button"
                      onClick={() => onChange({ songFile: song.filename, songStart: 0 }, true)}
                      className={cn(
                        "w-full p-2 rounded-sm border text-left transition-fast flex items-center justify-between gap-2",
                        isSelected
                          ? "bg-moss/10 border-moss text-ink-primary"
                          : "bg-subtle/40 border-border text-ink-secondary hover:bg-subtle"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Music className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-moss" : "text-ink-muted")} />
                        <span className="text-xs font-sans truncate">{song.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-ink-muted shrink-0">
                        {formatTimeSec(song.duration)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive CapCut-Style Song Trimmer */}
            {selectedSong && (
              <div className="p-3 rounded-sm bg-subtle border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-sans font-semibold text-ink-primary flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-moss" />
                    Song Trim Window ({reelDuration.toFixed(0)}s)
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-moss">
                    {formatTimeSec(editorState.songStart)} → {formatTimeSec(editorState.songStart + reelDuration)}
                  </span>
                </div>

                {/* Visual Timeline Bar */}
                <div className="relative h-8 bg-surface border border-border rounded-xs overflow-hidden flex items-center px-1">
                  {/* Decorative Audio Bars */}
                  <div className="w-full h-full flex items-center justify-between gap-0.5 opacity-30 pointer-events-none">
                    {Array.from({ length: 32 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-ink-secondary rounded-full"
                        style={{ height: `${25 + ((i * 37) % 65)}%` }}
                      />
                    ))}
                  </div>
                  {/* Highlighted Trim Selection Window */}
                  <div
                    className="absolute top-0 bottom-0 bg-moss/25 border-x-2 border-moss pointer-events-none"
                    style={{
                      left: `${(editorState.songStart / Math.max(1, songDuration)) * 100}%`,
                      width: `${Math.min(100, (reelDuration / Math.max(1, songDuration)) * 100)}%`,
                    }}
                  />
                </div>

                {/* Trim Start Slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={maxStart}
                    step={0.5}
                    value={Math.min(editorState.songStart, maxStart)}
                    onChange={(e) => {
                      const nextStart = Number(e.target.value);
                      onChange({ songStart: nextStart }, true);
                      if (audioRef.current && isPreviewPlaying) {
                        audioRef.current.currentTime = nextStart;
                      }
                    }}
                    className="w-full accent-moss cursor-pointer h-1.5 bg-surface rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-ink-muted">
                    <span>0:00</span>
                    <span>Drag slider to pick best part of song</span>
                    <span>{formatTimeSec(songDuration)}</span>
                  </div>
                </div>

                {/* Live Play Trimmed Segment Button */}
                <Button
                  size="sm"
                  variant={isPreviewPlaying ? "primary" : "secondary"}
                  className="w-full"
                  icon={isPreviewPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  onClick={toggleAudioTrimPreview}
                >
                  {isPreviewPlaying
                    ? `Playing Trim (${formatTimeSec(previewCurrentTime)}) · Stop`
                    : `Preview Trimmed Song (${formatTimeSec(editorState.songStart)} - ${formatTimeSec(editorState.songStart + reelDuration)})`}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Sticky Apply & Render Footer */}
      <div className="p-3.5 border-t border-border bg-subtle/40 space-y-2">
        <Button
          variant="primary"
          size="md"
          className="w-full"
          icon={isRendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          disabled={isRendering}
          onClick={onApplyRender}
        >
          {isRendering ? `Rendering Edits... ${renderProgress}%` : "Apply & Render Changes"}
        </Button>
        <p className="text-[10px] font-mono text-center text-ink-muted">
          Fast re-render uses clean video base (~4s)
        </p>
      </div>
    </div>
  );
}
