"use client";

import * as React from "react";
import {
  Sparkles,
  Check,
  Edit2,
  Trash2,
  AlertTriangle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Layers,
  Save,
  X,
  RefreshCw,
  Film,
  Sliders,
  CheckCircle2,
  Copy,
  Info,
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

interface StudioQuote {
  id: string;
  lines: string[];
  text: string;
  theme: string;
  mood: string;
  lang: string;
  hashtags: string[];
  status: "kept" | "rejected" | "pending";
  isDuplicate: boolean;
  duplicateWarning?: string;
  editedAt?: string;
}

const INITIAL_QUOTES: StudioQuote[] = [
  {
    id: "q-001",
    lines: [
      "toote huye dil ke tukde sambhalte nahi,",
      "aur log puchte hain tum badal kyu gaye.",
    ],
    text: "toote huye dil ke tukde sambhalte nahi,\naur log puchte hain tum badal kyu gaye.",
    theme: "loss",
    mood: "yaadein",
    lang: "roman-urdu",
    hashtags: ["#sad", "#dard", "#tanhai"],
    status: "kept",
    isDuplicate: false,
  },
  {
    id: "q-002",
    lines: [
      "sab kehte hain akela rehna buri baat hai,",
      "par bheed mein bhi to main akela hi tha.",
    ],
    text: "sab kehte hain akela rehna buri baat hai,\npar bheed mein bhi to main akela hi tha.",
    theme: "tanhai",
    mood: "solitude",
    lang: "roman-urdu",
    hashtags: ["#urdupoetry", "#tanhai", "#sadreel"],
    status: "pending",
    isDuplicate: false,
  },
  {
    id: "q-003",
    lines: [
      "sab kehte hain waqt sab theek kar deta hai,",
      "mera waqt to bas yaadein de gaya.",
    ],
    text: "sab kehte hain waqt sab theek kar deta hai,\nmera waqt to bas yaadein de gaya.",
    theme: "waqt",
    mood: "time",
    lang: "roman-urdu",
    hashtags: ["#waqt", "#yaadein", "#sad"],
    status: "pending",
    isDuplicate: true,
    duplicateWarning: "Similar line used 2 days ago in reel_2026-11-19_a (89% similarity score).",
  },
  {
    id: "q-004",
    lines: [
      "kuch baatein dil mein hi achi lagti hain,",
      "zuban par aate hi rishtey tod deti hain.",
    ],
    text: "kuch baatein dil mein hi achi lagti hain,\nzuban par aate hi rishtey tod deti hain.",
    theme: "dard",
    mood: "silence",
    lang: "roman-urdu",
    hashtags: ["#dard", "#khamoshi", "#poetry"],
    status: "pending",
    isDuplicate: false,
  },
  {
    id: "q-005",
    lines: [
      "raat gehri ho to yaadein cheekhti hain,",
      "din ke ujalon mein hum muskura kar thak jaate hain.",
    ],
    text: "raat gehri ho to yaadein cheekhti hain,\ndin ke ujalon mein hum muskura kar thak jaate hain.",
    theme: "hope-in-sadness",
    mood: "night",
    lang: "roman-urdu",
    hashtags: ["#raat", "#yaadein", "#deep"],
    status: "rejected",
    isDuplicate: false,
  },
];

const PREVIEW_CLIPS = [
  {
    id: "clip-1",
    name: "WhatsApp Video #1 (1024×576 Lanczos 60fps)",
    src: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    poster: "/static/swap/ready_to_post/thumbnail_a.jpg",
    contrast: 0.22,
  },
  {
    id: "clip-2",
    name: "alpine_meadow_dusk_4k.mp4 (1080×1920 60fps)",
    src: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    poster: "/static/swap/ready_to_post/thumbnail_a.jpg",
    contrast: 0.25,
  },
  {
    id: "clip-3",
    name: "moody_rain_dark_lake.mp4 (1080×1920 60fps)",
    src: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    poster: "/static/swap/ready_to_post/thumbnail_a.jpg",
    contrast: 0.24,
  },
];

const PREVIEW_STYLES = [
  { id: "d3_roman_urdu", label: "Formula D3 (Noto Serif SemiBold 30pt · Mid-Centre)" },
  { id: "degraaf", label: "De Graaf (Newsreader Serif 32pt · Darken 20%)" },
  { id: "serif_quiet", label: "Quiet Serif (Fraunces 28pt · Upright)" },
  { id: "sans_minimal", label: "Sans Minimal (Instrument Sans 26pt · Clean)" },
];

export default function QuoteStudioPage() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <QuoteStudioContent />
      </TooltipProvider>
    </ToastProvider>
  );
}

function QuoteStudioContent() {
  const { addToast } = useToast();

  const [quotes, setQuotes] = React.useState<StudioQuote[]>(INITIAL_QUOTES);
  const [selectedQuoteId, setSelectedQuoteId] = React.useState<string>(INITIAL_QUOTES[0].id);

  // Editing state
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState<string>("");

  // Controls Row state
  const [selectedTheme, setSelectedTheme] = React.useState("loss");
  const [selectedLang, setSelectedLang] = React.useState("roman-urdu");
  const [selectedCount, setSelectedCount] = React.useState("5");
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Live Preview Settings
  const [selectedClipId, setSelectedClipId] = React.useState(PREVIEW_CLIPS[0].id);
  const [selectedStyleId, setSelectedStyleId] = React.useState(PREVIEW_STYLES[0].id);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(true);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const activeQuote = quotes.find((q) => q.id === selectedQuoteId) || quotes[0];
  const activeClip = PREVIEW_CLIPS.find((c) => c.id === selectedClipId) || PREVIEW_CLIPS[0];

  // Generation Handler
  const handleGenerate = () => {
    setIsGenerating(true);
    addToast({
      type: "info",
      title: "Querying Gemini Flash",
      description: `Generating ${selectedCount} quotes with theme '${selectedTheme}' in ${selectedLang}...`,
    });

    setTimeout(() => {
      setIsGenerating(false);
      const newQuotes: StudioQuote[] = [
        {
          id: `q-gen-${Date.now()}-1`,
          lines: [
            "khamoshiyan cheekh uthti hain tanhai mein,",
            "dard vo nahi jo dikhe, vo hai jo chupaye na bane.",
          ],
          text: "khamoshiyan cheekh uthti hain tanhai mein,\ndard vo nahi jo dikhe, vo hai jo chupaye na bane.",
          theme: selectedTheme,
          mood: "silence",
          lang: selectedLang,
          hashtags: ["#khamoshi", "#dard", "#deep"],
          status: "pending",
          isDuplicate: false,
        },
        {
          id: `q-gen-${Date.now()}-2`,
          lines: [
            "umeed ke diye bujhne na dena,",
            "andhere kitne bhi gehre hon, subah zaroor hoti hai.",
          ],
          text: "umeed ke diye bujhne na dena,\nandhere kitne bhi gehre hon, subah zaroor hoti hai.",
          theme: "hope-in-sadness",
          mood: "hope",
          lang: selectedLang,
          hashtags: ["#umeed", "#subah", "#hope"],
          status: "pending",
          isDuplicate: false,
        },
      ];

      setQuotes((prev) => [...newQuotes, ...prev]);
      setSelectedQuoteId(newQuotes[0].id);

      addToast({
        type: "success",
        title: "Quotes Generated",
        description: `Generated ${newQuotes.length} fresh quotes. Deduplication gate verified.`,
      });
    }, 1500);
  };

  // Actions per quote: Keep, Reject, Edit
  const handleKeep = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setQuotes((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: "kept" } : q))
    );
    addToast({
      type: "success",
      title: "Quote Kept",
      description: "Marked for batch reel render queue.",
    });
  };

  const handleReject = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setQuotes((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: "rejected" } : q))
    );
    addToast({
      type: "info",
      title: "Quote Rejected",
      description: "Removed from candidate pool.",
    });
  };

  const startEditing = (quote: StudioQuote, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(quote.id);
    setEditText(quote.text);
  };

  const saveEdit = (id: string) => {
    const lines = editText.split("\n").filter((l) => l.trim().length > 0);
    setQuotes((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              text: editText,
              lines,
              editedAt: new Date().toLocaleTimeString(),
            }
          : q
      )
    );
    setEditingId(null);
    addToast({
      type: "success",
      title: "Quote Updated",
      description: "Changes synced to live video preview.",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  // Batch actions
  const keptCount = quotes.filter((q) => q.status === "kept").length;
  const rejectedCount = quotes.filter((q) => q.status === "rejected").length;
  const pendingCount = quotes.filter((q) => q.status === "pending").length;

  const handleBatchRender = () => {
    addToast({
      type: "success",
      title: "Batch Enqueued",
      description: `Sent ${keptCount} kept quotes to the automated video rendering pipeline.`,
    });
  };

  const handleSaveToDb = () => {
    addToast({
      type: "info",
      title: "Quotes Saved to Database",
      description: `Stored ${keptCount} validated quotes in db/reelforge.db.`,
    });
  };

  const handleRejectAllUnkept = () => {
    setQuotes((prev) =>
      prev.map((q) => (q.status === "pending" ? { ...q, status: "rejected" } : q))
    );
    addToast({
      type: "info",
      title: "Unkept Quotes Rejected",
      description: "Cleaned pending quotes from active view.",
    });
  };

  return (
    <AppShell title="Quote Studio" subtitle="AI Curation, Deduplication & Typography Lab">
      <div className="space-y-6 pb-20">
        {/* =====================================================================
            1. CONTROLS ROW (Theme, Language, Count, Generate)
            ===================================================================== */}
        <div className="p-4 rounded-md bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Theme Selector */}
            <div className="flex flex-col gap-1">
              <label htmlFor="studio-theme" className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Theme
              </label>
              <select
                id="studio-theme"
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="h-8 px-2.5 rounded-sm bg-subtle border border-border text-xs font-mono text-ink-primary outline-none focus-visible:border-moss focus-visible:ring-1 focus-visible:ring-moss/40"
              >
                <option value="loss">Loss & Yaadein</option>
                <option value="tanhai">Tanhai (Solitude)</option>
                <option value="waqt">Waqt (Time)</option>
                <option value="dard">Dard (Heartache)</option>
                <option value="hope-in-sadness">Hope in Sadness</option>
                <option value="calm-nature">Calm Nature</option>
              </select>
            </div>

            {/* Language Selector */}
            <div className="flex flex-col gap-1">
              <label htmlFor="studio-lang" className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Language
              </label>
              <select
                id="studio-lang"
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="h-8 px-2.5 rounded-sm bg-subtle border border-border text-xs font-mono text-ink-primary outline-none focus-visible:border-moss focus-visible:ring-1 focus-visible:ring-moss/40"
              >
                <option value="roman-urdu">Roman Urdu (Formula D3)</option>
                <option value="english">English (Quiet Nature)</option>
                <option value="urdu">Urdu Script</option>
              </select>
            </div>

            {/* Count Selector */}
            <div className="flex flex-col gap-1">
              <label htmlFor="studio-count" className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Batch Count
              </label>
              <select
                id="studio-count"
                value={selectedCount}
                onChange={(e) => setSelectedCount(e.target.value)}
                className="h-8 px-2.5 rounded-sm bg-subtle border border-border text-xs font-mono text-ink-primary outline-none focus-visible:border-moss focus-visible:ring-1 focus-visible:ring-moss/40"
              >
                <option value="3">3 Quotes</option>
                <option value="5">5 Quotes</option>
                <option value="10">10 Quotes</option>
              </select>
            </div>
          </div>

          {/* Primary Generate Trigger */}
          <div className="self-end md:self-auto">
            <Button
              variant="primary"
              size="md"
              icon={
                <Sparkles
                  className={cn("w-3.5 h-3.5 text-white", isGenerating && "animate-spin")}
                />
              }
              disabled={isGenerating}
              onClick={handleGenerate}
            >
              <span>{isGenerating ? "Generating..." : "Generate Quotes"}</span>
            </Button>
          </div>
        </div>

        {/* =====================================================================
            2. TWO-COLUMN STUDIO LAYOUT
            Left: List of QuoteBlocks with keep/edit/reject, mood tag, duplicate warning
            Right: Sticky Live Preview of selected quote over chosen clip
            ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* -------------------------------------------------------------------
              LEFT COLUMN: LIST OF QUOTEBLOCKS (7 COLS)
              ------------------------------------------------------------------- */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                  Results Pool ({quotes.length})
                </span>
                <span className="font-mono text-[10px] text-ink-muted">
                  Click to preview on video
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-status-success font-medium">
                  {keptCount} Kept
                </span>
                <span>•</span>
                <span className="text-ink-muted">{pendingCount} Pending</span>
              </div>
            </div>

            <div className="space-y-3">
              {quotes.map((quote) => {
                const isSelected = quote.id === selectedQuoteId;
                const isEditing = editingId === quote.id;

                return (
                    <Card
                      key={quote.id}
                      onClick={() => setSelectedQuoteId(quote.id)}
                      className={cn(
                        "p-4 sm:p-5 transition-fast cursor-pointer relative select-none outline-none focus-visible:ring-2 focus-visible:ring-moss/40",
                        isSelected
                          ? "bg-surface border-moss before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-moss before:rounded-r"
                          : "bg-surface/80 border-border hover:border-border-strong",
                        quote.status === "rejected" && "opacity-50"
                      )}
                    >
                    <div className="space-y-3">
                      {/* Top Bar: Mood tag, Status Badge, Selection Indicator */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-moss bg-moss-subtle px-2 py-0.5 rounded-sm border border-moss/20 font-medium">
                            #{quote.theme}
                          </span>
                          <span className="font-mono text-[10px] text-ink-muted">
                            mood: {quote.mood}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {quote.status === "kept" && (
                            <Badge variant="moss" dot dotStatus="success">
                              Kept
                            </Badge>
                          )}
                          {quote.status === "rejected" && (
                            <Badge variant="error">Rejected</Badge>
                          )}
                          {quote.status === "pending" && (
                            <Badge variant="default">Pending</Badge>
                          )}
                        </div>
                      </div>

                      {/* DUPLICATE WARNING BANNER (If duplicate) */}
                      {quote.isDuplicate && (
                        <div className="p-2.5 rounded-sm bg-status-warning/10 border border-status-warning/30 flex items-start gap-2.5 text-xs text-status-warning">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div className="space-y-0.5 min-w-0">
                            <span className="font-sans font-semibold block">
                              Duplicate Check Warning
                            </span>
                            <p className="font-mono text-[11px] text-ink-secondary leading-snug">
                              {quote.duplicateWarning ||
                                "High similarity with a previously published quote in the database."}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Quote Text Display OR Inline Editor */}
                      {isEditing ? (
                        <div
                          className="space-y-2 pt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Textarea
                            rows={3}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="font-serif italic text-base leading-relaxed text-ink-primary"
                            placeholder="Edit quote lines..."
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="primary"
                              icon={<Save className="w-3.5 h-3.5" />}
                              onClick={() => saveEdit(quote.id)}
                            >
                              Save Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<X className="w-3.5 h-3.5" />}
                              onClick={cancelEdit}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1">
                          <QuoteBlock size="md" theme={quote.theme}>
                            {quote.text}
                          </QuoteBlock>
                        </div>
                      )}

                      {/* Bottom Action Buttons: Keep / Edit / Reject */}
                      <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-ink-muted">
                          {quote.hashtags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleKeep(quote.id, e)}
                            className={cn(
                              "p-1.5 rounded-sm transition-fast flex items-center gap-1 text-xs font-mono",
                              quote.status === "kept"
                                ? "bg-status-success text-white font-medium"
                                : "hover:bg-subtle text-ink-secondary hover:text-status-success"
                            )}
                            title="Keep quote"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Keep</span>
                          </button>

                          <button
                            onClick={(e) => startEditing(quote, e)}
                            className="p-1.5 rounded-sm hover:bg-subtle text-ink-secondary hover:text-ink-primary transition-fast flex items-center gap-1 text-xs font-mono"
                            title="Edit quote lines"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>

                          <button
                            onClick={(e) => handleReject(quote.id, e)}
                            className={cn(
                              "p-1.5 rounded-sm transition-fast flex items-center gap-1 text-xs font-mono",
                              quote.status === "rejected"
                                ? "bg-status-error text-white font-medium"
                                : "hover:bg-subtle text-ink-secondary hover:text-status-error"
                            )}
                            title="Reject quote"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* -------------------------------------------------------------------
              RIGHT PANEL: STICKY LIVE PREVIEW OVER CHOSEN CLIP (5 COLS)
              ------------------------------------------------------------------- */}
          <aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
            <Card className="p-5 bg-surface space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-primary">
                    Live Style Preview
                  </h3>
                  <p className="font-mono text-[10px] text-ink-muted">
                    Rendered text over footage
                  </p>
                </div>
                <Badge variant="moss">Middle-Centre Lock</Badge>
              </div>

              {/* Clip & Style Selectors */}
              <div className="space-y-2.5 text-xs font-mono">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-ink-muted block">
                    Target Footage Clip
                  </label>
                  <select
                    value={selectedClipId}
                    onChange={(e) => setSelectedClipId(e.target.value)}
                    className="w-full h-8 px-2 rounded-sm bg-subtle border border-border text-ink-primary outline-none focus:border-moss"
                  >
                    {PREVIEW_CLIPS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-ink-muted block">
                    Active Style Preset
                  </label>
                  <select
                    value={selectedStyleId}
                    onChange={(e) => setSelectedStyleId(e.target.value)}
                    className="w-full h-8 px-2 rounded-sm bg-subtle border border-border text-ink-primary outline-none focus:border-moss"
                  >
                    {PREVIEW_STYLES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 9:16 LIVE PLAYER PREVIEW */}
              <div className="flex flex-col items-center pt-2">
                <div className="relative aspect-[9/16] w-full max-w-[280px] rounded-md overflow-hidden bg-ink-primary border border-border group">
                  <video
                    ref={videoRef}
                    src={activeClip.src}
                    poster={activeClip.poster}
                    loop
                    playsInline
                    muted={isMuted}
                    className="w-full h-full object-cover"
                    onClick={() => {
                      if (!videoRef.current) return;
                      if (isPlaying) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      } else {
                        videoRef.current.play().catch(() => {});
                        setIsPlaying(true);
                      }
                    }}
                  />

                  {/* LIVE OVERLAY TEXT PREVIEW (Middle-centre locked at y ≈ 960) */}
                  <div
                    onClick={() => {
                      if (!videoRef.current) return;
                      if (isPlaying) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      } else {
                        videoRef.current.play().catch(() => {});
                        setIsPlaying(true);
                      }
                    }}
                    className="absolute inset-x-3 top-[50%] -translate-y-1/2 flex flex-col items-center justify-center text-center pointer-events-none select-none z-10"
                  >
                    <p
                      className="font-serif font-semibold text-white tracking-normal leading-[1.35] whitespace-pre-line text-xs sm:text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
                      style={{
                        textShadow:
                          "0 2px 4px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.8)",
                      }}
                    >
                      {activeQuote.text}
                    </p>
                  </div>

                  {/* Play Indicator on Pause */}
                  {!isPlaying && (
                    <div
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.play().catch(() => {});
                          setIsPlaying(true);
                        }
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-ink-primary/20 cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-surface/90 border border-border text-moss flex items-center justify-center">
                        <Play className="w-3.5 h-3.5 ml-0.5" />
                      </div>
                    </div>
                  )}

                  {/* Video Overlay Footer */}
                  <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-ink-primary/80 to-transparent flex items-center justify-between text-white text-[10px] font-mono">
                    <span className="tabular-nums">1080×1920 @ 60fps</span>
                    <button
                      onClick={() => {
                        if (!videoRef.current) return;
                        videoRef.current.muted = !isMuted;
                        setIsMuted(!isMuted);
                      }}
                      className="p-1 hover:text-moss transition-fast"
                    >
                      {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <span className="font-mono text-[10px] text-ink-muted mt-2 text-center block">
                  Contrast: {activeClip.contrast} (Safe WCAG AA) • y=800 dark band
                </span>
              </div>
            </Card>
          </aside>
        </div>

        {/* =====================================================================
            3. STICKY FOOTER (BATCH ACTIONS)
            ===================================================================== */}
        <div className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-border px-4 sm:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="font-sans font-semibold text-ink-primary">
              Batch Selection:
            </span>
            <span className="text-status-success font-medium">
              {keptCount} Kept
            </span>
            <span>•</span>
            <span className="text-status-error">{rejectedCount} Rejected</span>
            <span>•</span>
            <span className="text-ink-muted">{pendingCount} Pending</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRejectAllUnkept}
              disabled={pendingCount === 0}
            >
              Reject Unkept
            </Button>

            <Button
              size="sm"
              variant="secondary"
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={handleSaveToDb}
              disabled={keptCount === 0}
            >
              Save to DB Pool
            </Button>

            <Button
              size="sm"
              variant="primary"
              icon={<Layers className="w-3.5 h-3.5" />}
              onClick={handleBatchRender}
              disabled={keptCount === 0}
            >
              Approve & Send to Render Queue ({keptCount})
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

