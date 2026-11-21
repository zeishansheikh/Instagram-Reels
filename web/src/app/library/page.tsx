"use client";

import * as React from "react";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  LayoutGrid,
  List,
  Search,
  Filter,
  Film,
  Check,
  Ban,
  Clock,
  Eye,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FolderSync,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";

import {
  AppShell,
  Button,
  Badge,
  StatusDot,
  Card,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Drawer,
  DrawerContent,
  ToastProvider,
  useToast,
  TooltipProvider,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components";
import { cn } from "@/lib/utils";

interface LibraryClip {
  id: string;
  filename: string;
  path: string;
  provider: "gdrive" | "local_folder" | "pinterest";
  providerLabel: string;
  mood: string;
  moodLabel: string;
  resolution: string;
  aspectRatio: string;
  fps: number;
  duration: number;
  bitrate: string;
  fileSize: string;
  luma: number;
  saturation: number;
  usageCount: number;
  usedInReels: { reelId: string; date: string; slot: string }[];
  isExcluded: boolean;
  videoSrc?: string;
  posterSrc?: string;
}

const INITIAL_CLIPS: LibraryClip[] = [
  {
    id: "clip-001",
    filename: "WhatsApp Video 2026-11-20 at 6.36.16 AM.mp4",
    path: "assets/backgrounds/WhatsApp Video 2026-11-20 at 6.36.16 AM.mp4",
    provider: "local_folder",
    providerLabel: "Local Assets",
    mood: "foggy_pine_forest",
    moodLabel: "Foggy Pine Forest",
    resolution: "1024×576",
    aspectRatio: "16:9 (Lanczos upscale)",
    fps: 30,
    duration: 5.42,
    bitrate: "1337 kbps",
    fileSize: "958 KB",
    luma: 0.19,
    saturation: 0.25,
    usageCount: 1,
    usedInReels: [
      { reelId: "reel_2026-11-21_a", date: "2026-11-21", slot: "Slot A" },
    ],
    isExcluded: false,
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
  },
  {
    id: "clip-002",
    filename: "WhatsApp Video 2026-11-20 at 6.36.18 AM.mp4",
    path: "assets/backgrounds/WhatsApp Video 2026-11-20 at 6.36.18 AM.mp4",
    provider: "local_folder",
    providerLabel: "Local Assets",
    mood: "mountain_stream",
    moodLabel: "Mountain Stream",
    resolution: "1024×576",
    aspectRatio: "16:9 (Lanczos upscale)",
    fps: 30,
    duration: 6.1,
    bitrate: "1316 kbps",
    fileSize: "1.5 MB",
    luma: 0.22,
    saturation: 0.28,
    usageCount: 0,
    usedInReels: [],
    isExcluded: false,
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
  },
  {
    id: "clip-003",
    filename: "alpine_meadow_dusk_4k.mp4",
    path: "gdrive/raw_reels/alpine_meadow_dusk_4k.mp4",
    provider: "gdrive",
    providerLabel: "Google Drive",
    mood: "alpine_meadow",
    moodLabel: "Alpine Meadow",
    resolution: "1080×1920",
    aspectRatio: "9:16 (Native)",
    fps: 60,
    duration: 12.4,
    bitrate: "16.2 Mbps",
    fileSize: "24.5 MB",
    luma: 0.28,
    saturation: 0.34,
    usageCount: 2,
    usedInReels: [
      { reelId: "reel_2026-11-19_b", date: "2026-11-19", slot: "Slot B" },
      { reelId: "reel_2026-11-16_a", date: "2026-11-16", slot: "Slot A" },
    ],
    isExcluded: false,
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
  },
  {
    id: "clip-004",
    filename: "moody_rain_dark_lake.mp4",
    path: "gdrive/raw_reels/moody_rain_dark_lake.mp4",
    provider: "gdrive",
    providerLabel: "Google Drive",
    mood: "moody_rain",
    moodLabel: "Moody Rain",
    resolution: "1080×1920",
    aspectRatio: "9:16 (Native)",
    fps: 60,
    duration: 14.2,
    bitrate: "15.0 Mbps",
    fileSize: "26.8 MB",
    luma: 0.16,
    saturation: 0.21,
    usageCount: 0,
    usedInReels: [],
    isExcluded: false,
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
  },
  {
    id: "clip-005",
    filename: "autumn_leaf_fall_path.mp4",
    path: "pinterest/curated/autumn_leaf_fall_path.mp4",
    provider: "pinterest",
    providerLabel: "Pinterest Discovery",
    mood: "autumn_leaves",
    moodLabel: "Autumn Leaves",
    resolution: "1080×1920",
    aspectRatio: "9:16 (Native)",
    fps: 60,
    duration: 9.8,
    bitrate: "14.2 Mbps",
    fileSize: "17.1 MB",
    luma: 0.24,
    saturation: 0.38,
    usageCount: 0,
    usedInReels: [],
    isExcluded: false,
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
  },
  {
    id: "clip-006",
    filename: "coastal_cliff_waves_mist.mp4",
    path: "gdrive/raw_reels/coastal_cliff_waves_mist.mp4",
    provider: "gdrive",
    providerLabel: "Google Drive",
    mood: "coastal_cliff",
    moodLabel: "Coastal Cliff",
    resolution: "1080×1920",
    aspectRatio: "9:16 (Native)",
    fps: 60,
    duration: 11.0,
    bitrate: "15.5 Mbps",
    fileSize: "21.3 MB",
    luma: 0.29,
    saturation: 0.22,
    usageCount: 1,
    usedInReels: [
      { reelId: "reel_2026-11-17_a", date: "2026-11-17", slot: "Slot A" },
    ],
    isExcluded: true,
    videoSrc: "/static/swap/ready_to_post/reel_2026-11-21_a.mp4",
    posterSrc: "/static/swap/ready_to_post/thumbnail_a.jpg",
  },
];

export default function LibraryPage() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <LibraryContent />
      </TooltipProvider>
    </ToastProvider>
  );
}

function LibraryContent() {
  const { addToast } = useToast();

  const [clips, setClips] = React.useState<LibraryClip[]>(INITIAL_CLIPS);
  const [viewMode, setViewMode] = React.useState<"grid" | "table">("grid");

  // Filters State
  const [providerFilter, setProviderFilter] = React.useState<string>("all");
  const [moodFilter, setMoodFilter] = React.useState<string>("all");
  const [resolutionFilter, setResolutionFilter] = React.useState<string>("all");
  const [usageFilter, setUsageFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Drive sync simulation & connection toggle
  const [isDriveConnected, setIsDriveConnected] = React.useState<boolean>(true);
  const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = React.useState<string>("14 minutes ago");

  // Detail Drawer state
  const [selectedClip, setSelectedClip] = React.useState<LibraryClip | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);

  // Video playback inside drawer
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handleSyncNow = () => {
    setIsSyncing(true);
    addToast({
      type: "info",
      title: "Syncing Google Drive",
      description: "Scanning folder for newly uploaded 9:16 nature clips...",
    });

    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime("Just now");
      addToast({
        type: "success",
        title: "Drive Sync Complete",
        description: "Indexed 24 clips. Quality gates and metadata verified.",
      });
    }, 1500);
  };

  const handleToggleExclude = (clipId: string) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === clipId) {
          const nextVal = !c.isExcluded;
          addToast({
            type: nextVal ? "warning" : "success",
            title: nextVal ? "Clip Excluded" : "Clip Restored",
            description: nextVal
              ? `"${c.filename}" will be skipped during autonomous reel builds.`
              : `"${c.filename}" is now available in the background pool.`,
          });
          return { ...c, isExcluded: nextVal };
        }
        return c;
      })
    );

    // Also update selected clip in drawer
    setSelectedClip((prev) =>
      prev && prev.id === clipId ? { ...prev, isExcluded: !prev.isExcluded } : prev
    );
  };

  const openClipDetail = (clip: LibraryClip) => {
    setSelectedClip(clip);
    setIsDrawerOpen(true);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Filter logic
  const filteredClips = React.useMemo(() => {
    return clips.filter((clip) => {
      if (providerFilter !== "all" && clip.provider !== providerFilter) return false;
      if (moodFilter !== "all" && clip.mood !== moodFilter) return false;
      if (resolutionFilter !== "all") {
        if (resolutionFilter === "1080x1920" && !clip.resolution.includes("1080×1920")) return false;
        if (resolutionFilter === "1024x576" && !clip.resolution.includes("1024×576")) return false;
      }
      if (usageFilter !== "all") {
        if (usageFilter === "unused" && (clip.usageCount > 0 || clip.isExcluded)) return false;
        if (usageFilter === "used_1" && clip.usageCount !== 1) return false;
        if (usageFilter === "used_2" && clip.usageCount < 2) return false;
        if (usageFilter === "excluded" && !clip.isExcluded) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!clip.filename.toLowerCase().includes(q) && !clip.moodLabel.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [clips, providerFilter, moodFilter, resolutionFilter, usageFilter, searchQuery]);

  // Is Drive disconnected empty state condition
  const showDisconnectedDriveEmptyState = !isDriveConnected && providerFilter === "gdrive";

  return (
    <AppShell title="Library" subtitle="Curated Nature Footage & Asset Store">
      <div className="space-y-6">
        {/* =====================================================================
            1. DRIVE SYNC STATUS LINE
            ===================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-md bg-surface border border-border">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "w-7 h-7 rounded-sm flex items-center justify-center shrink-0 border",
                isDriveConnected
                  ? "bg-moss-subtle text-moss border-moss/20"
                  : "bg-subtle text-ink-muted border-border"
              )}
            >
              {isDriveConnected ? (
                <Cloud className="w-4 h-4" />
              ) : (
                <CloudOff className="w-4 h-4" />
              )}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-sans text-xs font-semibold text-ink-primary">
                  Google Drive Pipeline
                </span>
                <span className="flex items-center gap-1 font-mono text-[10px] text-status-success font-medium">
                  <StatusDot status={isDriveConnected ? "success" : "neutral"} />
                  {isDriveConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <span className="font-mono text-[10px] text-ink-muted">
                {isDriveConnected
                  ? `Folder ID: 1A2...8xK · Last synced ${lastSyncTime} · 24 clips indexed`
                  : "No Google Drive folder linked in environment"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Quick toggle to demonstrate disconnected state */}
            <button
              onClick={() => setIsDriveConnected(!isDriveConnected)}
              className="text-[10px] font-mono text-ink-muted hover:text-ink-primary underline px-1"
            >
              {isDriveConnected ? "Simulate disconnect" : "Reconnect Drive"}
            </button>

            <Button
              size="sm"
              variant="secondary"
              icon={
                <RefreshCw
                  className={cn("w-3.5 h-3.5 text-moss", isSyncing && "animate-spin")}
                />
              }
              disabled={isSyncing || !isDriveConnected}
              onClick={handleSyncNow}
            >
              <span>{isSyncing ? "Syncing..." : "Sync now"}</span>
            </Button>
          </div>
        </div>

        {/* =====================================================================
            2. TOP FILTER ROW (Provider, Mood, Resolution, Usage) + VIEW TOGGLE
            ===================================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-md bg-surface border border-border">
          {/* Left: Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Provider Filter */}
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="h-8 px-2.5 rounded-sm bg-subtle border border-border hover:border-border-strong text-ink-primary font-mono text-xs outline-none focus:border-moss"
            >
              <option value="all">All Providers</option>
              <option value="gdrive">Google Drive</option>
              <option value="local_folder">Local Assets</option>
              <option value="pinterest">Pinterest</option>
            </select>

            {/* Mood Filter */}
            <select
              value={moodFilter}
              onChange={(e) => setMoodFilter(e.target.value)}
              className="h-8 px-2.5 rounded-sm bg-subtle border border-border hover:border-border-strong text-ink-primary font-mono text-xs outline-none focus:border-moss"
            >
              <option value="all">All Moods</option>
              <option value="foggy_pine_forest">Foggy Pine Forest</option>
              <option value="mountain_stream">Mountain Stream</option>
              <option value="alpine_meadow">Alpine Meadow</option>
              <option value="moody_rain">Moody Rain</option>
              <option value="autumn_leaves">Autumn Leaves</option>
              <option value="coastal_cliff">Coastal Cliff</option>
            </select>

            {/* Resolution Filter */}
            <select
              value={resolutionFilter}
              onChange={(e) => setResolutionFilter(e.target.value)}
              className="h-8 px-2.5 rounded-sm bg-subtle border border-border hover:border-border-strong text-ink-primary font-mono text-xs outline-none focus:border-moss"
            >
              <option value="all">All Resolutions</option>
              <option value="1080x1920">1080×1920 (9:16)</option>
              <option value="1024x576">1024×576</option>
            </select>

            {/* Usage Filter */}
            <select
              value={usageFilter}
              onChange={(e) => setUsageFilter(e.target.value)}
              className="h-8 px-2.5 rounded-sm bg-subtle border border-border hover:border-border-strong text-ink-primary font-mono text-xs outline-none focus:border-moss"
            >
              <option value="all">All Usage</option>
              <option value="unused">Unused (Fresh)</option>
              <option value="used_1">Used 1x</option>
              <option value="used_2">Used 2+ Times</option>
              <option value="excluded">Excluded</option>
            </select>

            {/* Clear filters shortcut */}
            {(providerFilter !== "all" ||
              moodFilter !== "all" ||
              resolutionFilter !== "all" ||
              usageFilter !== "all" ||
              searchQuery) && (
              <button
                onClick={() => {
                  setProviderFilter("all");
                  setMoodFilter("all");
                  setResolutionFilter("all");
                  setUsageFilter("all");
                  setSearchQuery("");
                }}
                className="text-[11px] font-mono text-moss hover:underline px-1"
              >
                Reset
              </button>
            )}
          </div>

          {/* Right: Search Input + View Toggle */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search clips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-2.5 rounded-sm bg-subtle border border-border text-xs font-mono text-ink-primary placeholder:text-ink-muted outline-none focus:border-moss"
              />
            </div>

            {/* Grid / Table View Mode Toggle */}
            <div className="flex items-center rounded-sm border border-border bg-subtle p-0.5 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-xs transition-fast",
                  viewMode === "grid"
                    ? "bg-surface text-ink-primary shadow-xs font-medium"
                    : "text-ink-muted hover:text-ink-primary"
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-1.5 rounded-xs transition-fast",
                  viewMode === "table"
                    ? "bg-surface text-ink-primary shadow-xs font-medium"
                    : "text-ink-muted hover:text-ink-primary"
                )}
                aria-label="Table view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            3. MAIN CONTENT: DISCONNECTED EMPTY STATE VS GRID VS TABLE
            ===================================================================== */}
        {showDisconnectedDriveEmptyState ? (
          <Card className="p-12 md:p-16 text-center bg-surface">
            <EmptyState
              title="Google Drive Not Connected"
              description="To sync clips from Google Drive, link your Google Drive folder ID in your .env configuration (GDRIVE_FOLDER_ID) or authenticate service account credentials."
              action={
                <Button
                  size="md"
                  variant="primary"
                  icon={<Cloud className="w-4 h-4" />}
                  onClick={() => {
                    setIsDriveConnected(true);
                    addToast({
                      type: "success",
                      title: "Drive Connected",
                      description: "Folder synchronized with 24 clips indexed.",
                    });
                  }}
                >
                  Connect Google Drive
                </Button>
              }
            />
          </Card>
        ) : filteredClips.length === 0 ? (
          <Card className="p-12 text-center bg-surface">
            <EmptyState
              title="No Clips Match Filters"
              description="Try adjusting your provider, mood, resolution, or usage filters to reveal clips."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setProviderFilter("all");
                    setMoodFilter("all");
                    setResolutionFilter("all");
                    setUsageFilter("all");
                    setSearchQuery("");
                  }}
                >
                  Clear All Filters
                </Button>
              }
            />
          </Card>
        ) : viewMode === "grid" ? (
          /* -------------------------------------------------------------------
              A. GRID VIEW OF VIDEOTILES (HOVER TO PLAY)
              ------------------------------------------------------------------- */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredClips.map((clip) => {
              const statusColor = clip.isExcluded
                ? "error"
                : clip.usageCount === 0
                ? "success"
                : "neutral";
              const statusLabel = clip.isExcluded
                ? "Excluded"
                : clip.usageCount === 0
                ? "Fresh"
                : `Used ${clip.usageCount}x`;

              return (
                <div
                  key={clip.id}
                  onClick={() => openClipDetail(clip)}
                  className="group relative aspect-[9/16] w-full rounded-md overflow-hidden bg-surface border border-border hover:border-moss transition-fast cursor-pointer select-none flex flex-col justify-between p-2"
                >
                  {/* Video Background with Hover-to-Play */}
                  <video
                    src={clip.videoSrc}
                    poster={clip.posterSrc}
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onMouseEnter={(e) => {
                      const v = e.currentTarget;
                      v.currentTime = 0;
                      v.play().catch(() => {});
                    }}
                    onMouseLeave={(e) => {
                      const v = e.currentTarget;
                      v.pause();
                    }}
                  />

                  {/* Top Gradient & Provider Tag */}
                  <div className="relative z-10 flex items-start justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-wider bg-ink-primary/80 backdrop-blur-xs text-white px-1.5 py-0.5 rounded-xs border border-white/10">
                      {clip.provider === "gdrive"
                        ? "Drive"
                        : clip.provider === "pinterest"
                        ? "Pin"
                        : "Local"}
                    </span>

                    {clip.isExcluded && (
                      <span className="font-mono text-[9px] bg-status-error/90 text-white px-1.5 py-0.5 rounded-xs font-semibold">
                        Excluded
                      </span>
                    )}
                  </div>

                  {/* Bottom Meta Scrim */}
                  <div className="relative z-10 p-2 pt-6 -mx-2 -mb-2 bg-gradient-to-t from-ink-primary/90 via-ink-primary/50 to-transparent text-white font-mono text-[10px] space-y-0.5">
                    <p className="font-sans text-[11px] font-medium truncate text-white">
                      {clip.moodLabel}
                    </p>
                    <div className="flex items-center justify-between text-white/80 text-[9px]">
                      <span>{clip.duration}s</span>
                      <div className="flex items-center gap-1">
                        <StatusDot status={statusColor} />
                        <span>{statusLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* -------------------------------------------------------------------
              B. DENSE ACCESSIBLE TABLE VIEW
              ------------------------------------------------------------------- */
          <Card className="bg-surface overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Preview</TableHead>
                  <TableHead>Clip Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Mood</TableHead>
                  <TableHead>Resolution</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClips.map((clip) => (
                  <TableRow
                    key={clip.id}
                    onClick={() => openClipDetail(clip)}
                    className="cursor-pointer"
                  >
                    {/* Thumbnail */}
                    <TableCell className="w-16 py-1.5">
                      <div className="relative aspect-[9/16] w-9 rounded-xs overflow-hidden bg-ink-primary/10 border border-border">
                        <img
                          src={clip.posterSrc || "/static/swap/ready_to_post/thumbnail_a.jpg"}
                          alt="Clip thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TableCell>

                    {/* Clip Name */}
                    <TableCell className="font-mono text-xs text-ink-primary font-medium max-w-[220px] truncate">
                      {clip.filename}
                    </TableCell>

                    {/* Provider */}
                    <TableCell className="font-mono text-xs text-ink-secondary">
                      {clip.providerLabel}
                    </TableCell>

                    {/* Mood */}
                    <TableCell className="font-sans text-xs text-ink-secondary">
                      {clip.moodLabel}
                    </TableCell>

                    {/* Resolution & FPS */}
                    <TableCell className="font-mono text-xs tabular-nums text-ink-secondary">
                      {clip.resolution} @ {clip.fps}fps
                    </TableCell>

                    {/* Duration */}
                    <TableCell className="font-mono text-xs tabular-nums text-ink-secondary">
                      {clip.duration}s
                    </TableCell>

                    {/* Usage count */}
                    <TableCell className="font-mono text-xs tabular-nums text-ink-primary">
                      {clip.usageCount === 0 ? (
                        <span className="text-status-success font-medium">Fresh (0)</span>
                      ) : (
                        `${clip.usageCount} reels`
                      )}
                    </TableCell>

                    {/* Exclude Status */}
                    <TableCell>
                      {clip.isExcluded ? (
                        <Badge variant="error">Excluded</Badge>
                      ) : (
                        <Badge variant="moss">Active</Badge>
                      )}
                    </TableCell>

                    {/* Inspect Button */}
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          openClipDetail(clip);
                        }}
                      >
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* =====================================================================
            4. DETAIL DRAWER: PREVIEW, METADATA, "USED IN" REELS, EXCLUDE TOGGLE
            ===================================================================== */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          {selectedClip && (
            <DrawerContent
              title="Clip Inspection"
              description="Footage quality gates & usage telemetry"
              className="max-w-md w-full"
            >
              <div className="space-y-6 pt-2">
                {/* 1. Large 9:16 Video Player Preview */}
                <div className="flex justify-center">
                  <div className="relative aspect-[9/16] w-full max-w-[280px] rounded-md overflow-hidden bg-ink-primary border border-border shadow-sm">
                    <video
                      ref={videoRef}
                      src={selectedClip.videoSrc}
                      poster={selectedClip.posterSrc}
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
                      onTimeUpdate={() => {
                        if (videoRef.current) {
                          setCurrentTime(videoRef.current.currentTime);
                        }
                      }}
                    />

                    {/* Play/Pause Center Overlay */}
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
                        <div className="w-10 h-10 rounded-full bg-surface/90 text-moss flex items-center justify-center shadow-md">
                          <Play className="w-4 h-4 ml-0.5" />
                        </div>
                      </div>
                    )}

                    {/* Controls Footer */}
                    <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-ink-primary/80 to-transparent flex items-center justify-between text-white text-[10px] font-mono">
                      <span className="tabular-nums">
                        {currentTime.toFixed(1)}s / {selectedClip.duration}s
                      </span>
                      <button
                        onClick={() => {
                          if (!videoRef.current) return;
                          videoRef.current.muted = !isMuted;
                          setIsMuted(!isMuted);
                        }}
                        className="p-1 hover:text-moss transition-fast"
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Exclude from Rotation Toggle */}
                <div className="p-3.5 rounded-sm bg-subtle border border-border flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="font-sans text-xs font-semibold text-ink-primary block cursor-pointer">
                      Exclude from rotation
                    </label>
                    <span className="font-sans text-[11px] text-ink-muted block leading-snug">
                      Skip this footage during autonomous batch reel generation
                    </span>
                  </div>
                  <Switch
                    checked={selectedClip.isExcluded}
                    onCheckedChange={() => handleToggleExclude(selectedClip.id)}
                  />
                </div>

                {/* 3. Detailed Technical Metadata */}
                <div className="space-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted block">
                    Technical Specifications
                  </span>
                  <div className="divide-y divide-border border-y border-border text-xs font-mono">
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-ink-muted">Filename</span>
                      <span className="text-ink-primary truncate max-w-[200px]" title={selectedClip.filename}>
                        {selectedClip.filename}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-ink-muted">Provider</span>
                      <span className="text-ink-primary font-medium">{selectedClip.providerLabel}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-ink-muted">Dimensions</span>
                      <span className="text-ink-primary tabular-nums">{selectedClip.resolution}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-ink-muted">Aspect Ratio</span>
                      <span className="text-ink-primary">{selectedClip.aspectRatio}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-ink-muted">Framerate</span>
                      <span className="text-ink-primary tabular-nums">{selectedClip.fps} fps</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-ink-muted">Bitrate / Size</span>
                      <span className="text-ink-primary tabular-nums">{selectedClip.bitrate} ({selectedClip.fileSize})</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-ink-muted">Luminance / Saturation</span>
                      <span className="text-status-success tabular-nums font-medium">
                        Luma: {selectedClip.luma} · Sat: {selectedClip.saturation}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. "Used in" Reels Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      Used in Reels ({selectedClip.usedInReels.length})
                    </span>
                    {selectedClip.usedInReels.length === 0 && (
                      <span className="font-mono text-[10px] text-status-success font-medium">
                        Fresh candidate
                      </span>
                    )}
                  </div>

                  {selectedClip.usedInReels.length === 0 ? (
                    <div className="p-3 rounded-sm bg-subtle border border-border text-xs font-sans text-ink-secondary text-center">
                      This clip has not yet been used in any published or scheduled reel.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedClip.usedInReels.map((usage) => (
                        <div
                          key={usage.reelId}
                          className="p-2.5 rounded-sm bg-subtle border border-border flex items-center justify-between text-xs font-mono"
                        >
                          <div className="flex items-center gap-2">
                            <Film className="w-3.5 h-3.5 text-moss" />
                            <span className="text-ink-primary font-medium">{usage.reelId}</span>
                          </div>
                          <span className="text-ink-muted tabular-nums">
                            {usage.date} · {usage.slot}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      addToast({
                        type: "success",
                        title: "Clip Queued",
                        description: `"${selectedClip.filename}" assigned as footage for next build.`,
                      });
                    }}
                  >
                    Use in Next Reel
                  </Button>
                </div>
              </div>
            </DrawerContent>
          )}
        </Drawer>
      </div>
    </AppShell>
  );
}

