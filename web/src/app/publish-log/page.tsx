"use client";

import * as React from "react";
import Link from "next/link";
import {
  Send,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
  Info,
} from "lucide-react";

import {
  AppShell,
  Button,
  Badge,
  StatusDot,
  Card,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ToastProvider,
  useToast,
  TooltipProvider,
} from "@/components";
import { cn } from "@/lib/utils";

interface PublishLogEntry {
  id: string;
  timestamp: string;
  dateStr: string;
  slot: "Slot A" | "Slot B";
  quotePreview: string;
  status: "published" | "failed" | "retrying" | "queued";
  permalink?: string;
  mediaId?: string;
  clipName: string;
  errorExplanation?: string;
  suggestedFix?: string;
}

const INITIAL_LOGS: PublishLogEntry[] = [
  {
    id: "pub-001",
    timestamp: "21 Nov 18:00 UTC",
    dateStr: "2026-11-21",
    slot: "Slot A",
    quotePreview: "toote huye dil ke tukde sambhalte nahi, aur log puchte hain...",
    status: "published",
    permalink: "https://www.instagram.com/reel/DA29k8xL1mQ/",
    mediaId: "18049182940192841",
    clipName: "WhatsApp_Video_2026-11-20_at_6.36.16_AM",
  },
  {
    id: "pub-002",
    timestamp: "20 Nov 16:00 PKT",
    dateStr: "2026-11-20",
    slot: "Slot B",
    quotePreview: "Quiet solitude upon still waters reflects what words cannot...",
    status: "published",
    permalink: "https://www.instagram.com/reel/DA11p7xM9qP/",
    mediaId: "18038172948192014",
    clipName: "moody_rain_dark_lake",
  },
  {
    id: "pub-003",
    timestamp: "20 Nov 08:30 PKT",
    dateStr: "2026-11-20",
    slot: "Slot A",
    quotePreview: "Frost coats the glass tonight, but underneath sleeping soil...",
    status: "published",
    permalink: "https://www.instagram.com/reel/DA09a5xQ8wZ/",
    mediaId: "18037192840192831",
    clipName: "WhatsApp_Video_2026-11-20_at_6.36.23_AM",
  },
  {
    id: "pub-004",
    timestamp: "19 Nov 16:00 PKT",
    dateStr: "2026-11-19",
    slot: "Slot B",
    quotePreview: "sab kehte hain waqt sab theek kar deta hai, mera waqt to...",
    status: "failed",
    mediaId: "18036182947192839",
    clipName: "alpine_meadow_dusk_4k",
    errorExplanation:
      "Meta Graph API transcode worker timed out (status_code: ERROR). Video bitrate peaked at 22.4 Mbps, exceeding Instagram's recommended 20 Mbps ceiling.",
    suggestedFix:
      "Remedy applied: Re-encode with strict bitrate caps (-b:v 15M -maxrate 20M -bufsize 40M) and click Retry.",
  },
  {
    id: "pub-005",
    timestamp: "19 Nov 08:30 PKT",
    dateStr: "2026-11-19",
    slot: "Slot A",
    quotePreview: "sab kehte hain akela rehna buri baat hai, par bheed mein bhi...",
    status: "published",
    permalink: "https://www.instagram.com/reel/DAy8m4xP7rK/",
    mediaId: "18035192840192812",
    clipName: "WhatsApp_Video_2026-11-20_at_6.36.21_AM",
  },
  {
    id: "pub-006",
    timestamp: "18 Nov 16:00 PKT",
    dateStr: "2026-11-18",
    slot: "Slot B",
    quotePreview: "kuch baatein dil mein hi achi lagti hain, zuban par aate hi...",
    status: "published",
    permalink: "https://www.instagram.com/reel/DAx7n3xL6wP/",
    mediaId: "18034182949192855",
    clipName: "WhatsApp_Video_2026-11-20_at_6.36.18_AM",
  },
  {
    id: "pub-007",
    timestamp: "18 Nov 08:30 PKT",
    dateStr: "2026-11-18",
    slot: "Slot A",
    quotePreview: "woh jo kabhi jaan hua karte the, aaj unka naam lene par bhi...",
    status: "published",
    permalink: "https://www.instagram.com/reel/DAw6k2xM5qA/",
    mediaId: "18033172948192801",
    clipName: "coastal_cliff_waves_mist",
  },
  {
    id: "pub-008",
    timestamp: "17 Nov 16:00 PKT",
    dateStr: "2026-11-17",
    slot: "Slot B",
    quotePreview: "raat gehri ho to yaadein cheekhti hain, din ke ujalon mein...",
    status: "published",
    permalink: "https://www.instagram.com/reel/DAv5j1xQ4zT/",
    mediaId: "18032182940192877",
    clipName: "autumn_leaf_fall_path",
  },
];

// Weekly post counts for simple SVG line chart
const WEEKLY_POSTS = [
  { week: "W43", label: "Oct 18", count: 10 },
  { week: "W44", label: "Oct 25", count: 14 },
  { week: "W45", label: "Nov 01", count: 12 },
  { week: "W46", label: "Nov 08", count: 14 },
  { week: "W47", label: "Nov 15", count: 13 },
  { week: "Current", label: "Nov 21", count: 14 },
];

export default function PublishLogPage() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <PublishLogContent />
      </TooltipProvider>
    </ToastProvider>
  );
}

function PublishLogContent() {
  const { addToast } = useToast();

  const [logs, setLogs] = React.useState<PublishLogEntry[]>(INITIAL_LOGS);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [retryingId, setRetryingId] = React.useState<string | null>(null);

  // Retry action for failed release
  const handleRetry = (entry: PublishLogEntry) => {
    setRetryingId(entry.id);
    addToast({
      type: "info",
      title: "Retrying Publication",
      description: `Re-transcoding "${entry.slot}" with 15Mbps cap and uploading to Meta Graph container...`,
    });

    setTimeout(() => {
      setRetryingId(null);
      setLogs((prev) =>
        prev.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                status: "published",
                permalink: "https://www.instagram.com/reel/DAz9k9xL2mR/",
                mediaId: "18049982941192800",
                errorExplanation: undefined,
                suggestedFix: undefined,
              }
            : item
        )
      );

      addToast({
        type: "success",
        title: "Retry Successful",
        description: `Published successfully! Media ID: 18049982941192800 · Link generated.`,
      });
    }, 2000);
  };

  // Filtered log entries
  const filteredLogs = React.useMemo(() => {
    return logs.filter((entry) => {
      if (statusFilter !== "all" && entry.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          entry.quotePreview.toLowerCase().includes(q) ||
          entry.clipName.toLowerCase().includes(q) ||
          (entry.mediaId && entry.mediaId.toLowerCase().includes(q)) ||
          (entry.errorExplanation && entry.errorExplanation.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [logs, statusFilter, searchQuery]);

  // Aggregate stats
  const totalPublished = logs.filter((l) => l.status === "published").length;
  const totalFailed = logs.filter((l) => l.status === "failed").length;
  const successRate = ((totalPublished / logs.length) * 100).toFixed(1);

  return (
    <AppShell title="Publish Log" subtitle="Broadcast Telemetry & Meta Graph History">
      <div className="space-y-6 pb-12">
        {/* =====================================================================
            1. STAT BLOCKS & SIMPLE SVG LINE CHART (POSTS PER WEEK)
            ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left: 3 Small Stat Blocks (6 cols on lg) */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Stat 1: Total Published */}
            <Card className="p-4 bg-surface flex flex-col justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Total Published
              </span>
              <div className="space-y-0.5 my-2">
                <span className="font-mono tabular-nums text-2xl font-semibold text-ink-primary">
                  {totalPublished}
                </span>
                <span className="font-mono text-[11px] text-moss block font-medium">
                  +14 this week
                </span>
              </div>
              <span className="font-mono text-[9px] text-ink-muted">
                Formula D3 Cadence (2/day)
              </span>
            </Card>

            {/* Stat 2: Success Rate */}
            <Card className="p-4 bg-surface flex flex-col justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Success Rate
              </span>
              <div className="space-y-0.5 my-2">
                <span className="font-mono tabular-nums text-2xl font-semibold text-status-success">
                  {successRate}%
                </span>
                <span className="font-mono text-[11px] text-ink-secondary block">
                  {totalPublished} pass · {totalFailed} failed
                </span>
              </div>
              <span className="font-mono text-[9px] text-ink-muted">
                WCAG AA & 1080p60 checked
              </span>
            </Card>

            {/* Stat 3: Channel Health */}
            <Card className="p-4 bg-surface flex flex-col justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Broadcast Target
              </span>
              <div className="space-y-0.5 my-2">
                <span className="font-mono text-base font-semibold text-ink-primary truncate block">
                  @enoent.7
                </span>
                <span className="font-mono text-[11px] text-moss flex items-center gap-1 font-medium">
                  <StatusDot status="success" />
                  Buffer channel active
                </span>
              </div>
              <span className="font-mono text-[9px] text-ink-muted">
                Token expires in 58 days
              </span>
            </Card>
          </div>

          {/* Right: Line Chart (Posts per week) (6 cols on lg) */}
          <Card className="lg:col-span-6 p-4 bg-surface flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-moss" />
                <span className="font-sans text-xs font-semibold text-ink-primary">
                  Posts Per Week
                </span>
              </div>
              <span className="font-mono text-[10px] text-ink-muted">
                Target: 14 reels/week
              </span>
            </div>

            {/* Simple Clean SVG Line Chart */}
            <div className="py-2">
              <svg
                viewBox="0 0 500 110"
                className="w-full h-24 overflow-visible"
                aria-label="Posts per week line chart"
              >
                <defs>
                  <linearGradient id="mossGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2F5D50" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2F5D50" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal baseline guide rules */}
                <line x1="20" y1="20" x2="480" y2="20" stroke="#E8E6E1" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="20" y1="55" x2="480" y2="55" stroke="#E8E6E1" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="20" y1="90" x2="480" y2="90" stroke="#E8E6E1" strokeWidth="1" />

                {/* SVG Area Fill */}
                <path
                  d="M 40 70 L 120 25 L 200 45 L 280 25 L 360 35 L 440 25 L 440 90 L 40 90 Z"
                  fill="url(#mossGradient)"
                />

                {/* SVG Stroke Line */}
                <path
                  d="M 40 70 L 120 25 L 200 45 L 280 25 L 360 35 L 440 25"
                  fill="none"
                  stroke="#2F5D50"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points with Tabular Numbers */}
                {[
                  { x: 40, y: 70, val: 10 },
                  { x: 120, y: 25, val: 14 },
                  { x: 200, y: 45, val: 12 },
                  { x: 280, y: 25, val: 14 },
                  { x: 360, y: 35, val: 13 },
                  { x: 440, y: 25, val: 14 },
                ].map((pt, i) => (
                  <g key={i}>
                    <circle cx={pt.x} cy={pt.y} r="3.5" fill="#FFFFFF" stroke="#2F5D50" strokeWidth="2" />
                    <text
                      x={pt.x}
                      y={pt.y - 8}
                      textAnchor="middle"
                      className="font-mono text-[9px] fill-[#16150F] font-semibold select-none"
                    >
                      {pt.val}
                    </text>
                  </g>
                ))}
              </svg>

              {/* X-Axis Labels */}
              <div className="flex items-center justify-between px-4 pt-1 font-mono text-[10px] text-ink-muted border-t border-border/60">
                {WEEKLY_POSTS.map((item) => (
                  <span key={item.week} className="tabular-nums">
                    {item.week} ({item.label})
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* =====================================================================
            2. FILTERS & SEARCH ROW
            ===================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md bg-surface border border-border">
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 rounded-sm bg-subtle border border-border text-xs font-mono text-ink-primary outline-none focus:border-moss"
            >
              <option value="all">All Statuses ({logs.length})</option>
              <option value="published">Published ({totalPublished})</option>
              <option value="failed">Failed ({totalFailed})</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search quote, ID, error..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-2.5 rounded-sm bg-subtle border border-border text-xs font-mono text-ink-primary placeholder:text-ink-muted outline-none focus:border-moss"
            />
          </div>
        </div>

        {/* =====================================================================
            3. DENSE PUBLISH LOG TABLE
            ===================================================================== */}
        <Card className="bg-surface overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Time</TableHead>
                <TableHead className="w-20">Slot</TableHead>
                <TableHead>Quote Preview</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-32">Permalink</TableHead>
                <TableHead>Error Summary & Suggested Fix</TableHead>
                <TableHead className="w-24 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((entry) => {
                const isPublished = entry.status === "published";
                const isFailed = entry.status === "failed";
                const isRetrying = retryingId === entry.id;

                return (
                  <TableRow key={entry.id} className="align-top">
                    {/* Timestamp */}
                    <TableCell className="font-mono text-xs tabular-nums text-ink-primary whitespace-nowrap pt-3">
                      {entry.timestamp}
                    </TableCell>

                    {/* Slot */}
                    <TableCell className="font-mono text-xs text-ink-secondary whitespace-nowrap pt-3">
                      <span className="font-medium">{entry.slot}</span>
                    </TableCell>

                    {/* Quote Preview */}
                    <TableCell className="max-w-[280px] pt-3">
                      <p className="font-serif italic text-xs text-ink-primary leading-snug line-clamp-2">
                        “{entry.quotePreview}”
                      </p>
                      <span className="font-mono text-[10px] text-ink-muted block mt-1 truncate">
                        Clip: {entry.clipName}
                      </span>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className="pt-3">
                      {isPublished && (
                        <Badge variant="moss" dot dotStatus="success">
                          Published
                        </Badge>
                      )}
                      {isFailed && (
                        <Badge variant="error" dot dotStatus="error">
                          Failed
                        </Badge>
                      )}
                      {isRetrying && (
                        <Badge variant="warning" dot dotStatus="warning" pulse>
                          Retrying...
                        </Badge>
                      )}
                    </TableCell>

                    {/* Permalink */}
                    <TableCell className="pt-3">
                      {entry.permalink ? (
                        <a
                          href={entry.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-moss hover:underline"
                        >
                          <span>Instagram</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-ink-muted">—</span>
                      )}
                    </TableCell>

                    {/* Error Summary & Plain-English Explanation with Suggested Fix */}
                    <TableCell className="pt-3">
                      {isFailed ? (
                        <div className="p-2.5 rounded-sm bg-status-error/10 border border-status-error/25 text-xs space-y-1.5 text-ink-primary">
                          <div className="flex items-start gap-1.5 text-status-error font-medium">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{entry.errorExplanation}</span>
                          </div>
                          {entry.suggestedFix && (
                            <div className="font-mono text-[11px] text-ink-secondary bg-surface p-1.5 rounded-xs border border-border">
                              <span className="text-moss font-semibold">Suggested Fix: </span>
                              {entry.suggestedFix}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="font-mono text-[11px] text-ink-muted pt-0.5">
                          Clean release · Media ID: <code className="text-ink-secondary">{entry.mediaId}</code>
                        </div>
                      )}
                    </TableCell>

                    {/* Retry Action */}
                    <TableCell className="text-right pt-3">
                      {isFailed && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={
                            <RefreshCw
                              className={cn("w-3.5 h-3.5 text-moss", isRetrying && "animate-spin")}
                            />
                          }
                          disabled={isRetrying}
                          onClick={() => handleRetry(entry)}
                        >
                          <span>{isRetrying ? "Retrying..." : "Retry"}</span>
                        </Button>
                      )}

                      {isPublished && (
                        <span className="font-mono text-[11px] text-status-success font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Logged</span>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppShell>
  );
}

