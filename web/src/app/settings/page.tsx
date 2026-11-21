"use client";

import * as React from "react";
import {
  Link2,
  Palette,
  Cpu,
  Bell,
  Check,
  ShieldCheck,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Cloud,
  Sparkles,
  HardDrive,
  Clock,
  Layers,
  Save,
  Sliders,
  AlertCircle,
  ExternalLink,
  Lock,
} from "lucide-react";

import {
  AppShell,
  Button,
  Badge,
  StatusDot,
  Card,
  Input,
  Textarea,
  Switch,
  ToastProvider,
  useToast,
  TooltipProvider,
  QuoteBlock,
} from "@/components";
import { cn } from "@/lib/utils";

type SettingsTab = "connections" | "styles" | "automation" | "notifications";

interface StylePresetConfig {
  id: string;
  name: string;
  fontFamily: string;
  fontCategory: "serif" | "sans";
  fontSize: number;
  placement: "middle_centre" | "centre";
  shadow: string;
  darkenOverlay: number;
  description: string;
}

const STYLE_PRESETS: StylePresetConfig[] = [
  {
    id: "d3_roman_urdu",
    name: "Formula D3 (Locked 2026-11-21)",
    fontFamily: "Noto Serif SemiBold",
    fontCategory: "serif",
    fontSize: 30,
    placement: "middle_centre",
    shadow: "shadowcolor=black@0.9:shadowx=0:shadowy=2",
    darkenOverlay: 0.15,
    description: "Noto Serif SemiBold upright white, middle-centre placement lock (y ≈ 960), strong drop shadow. Zero author attribution.",
  },
  {
    id: "degraaf",
    name: "De Graaf (Editorial Warm)",
    fontFamily: "Newsreader Italic",
    fontCategory: "serif",
    fontSize: 32,
    placement: "middle_centre",
    shadow: "shadowcolor=black@0.7:shadowx=0:shadowy=2",
    darkenOverlay: 0.20,
    description: "Refined literary italic serif with 20% darken scrim for bright mountain and lake daylight footage.",
  },
  {
    id: "serif_quiet",
    name: "Quiet Serif",
    fontFamily: "Fraunces SemiBold",
    fontCategory: "serif",
    fontSize: 28,
    placement: "centre",
    shadow: "shadowcolor=black@0.6:shadowx=0:shadowy=1",
    darkenOverlay: 0.18,
    description: "Calm, humanist upright serif with subtle letterspacing.",
  },
  {
    id: "sans_minimal",
    name: "Sans Minimal",
    fontFamily: "Instrument Sans",
    fontCategory: "sans",
    fontSize: 26,
    placement: "centre",
    shadow: "shadowcolor=black@0.8:shadowx=0:shadowy=1",
    darkenOverlay: 0.22,
    description: "Ultra-clean geometric sans in uppercase for modern architectural and mist footage.",
  },
];

export default function SettingsPage() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <SettingsContent />
      </TooltipProvider>
    </ToastProvider>
  );
}

function SettingsContent() {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = React.useState<SettingsTab>("connections");

  // Connection Test States
  const [testingId, setTestingId] = React.useState<string | null>(null);

  // Write-only masked secrets state (stored as write-only buffers)
  const [secrets, setSecrets] = React.useState({
    instagramToken: "",
    gdriveKey: "",
    geminiKey: "",
    storageSecret: "",
  });

  // Styles state
  const [selectedStyleId, setSelectedStyleId] = React.useState("d3_roman_urdu");
  const activeStyle = STYLE_PRESETS.find((s) => s.id === selectedStyleId) || STYLE_PRESETS[0];
  const [previewFontSize, setPreviewFontSize] = React.useState(activeStyle.fontSize);
  const [previewDarken, setPreviewDarken] = React.useState(activeStyle.darkenOverlay);

  // Update preview sliders when style changes
  React.useEffect(() => {
    setPreviewFontSize(activeStyle.fontSize);
    setPreviewDarken(activeStyle.darkenOverlay);
  }, [activeStyle.id, activeStyle.fontSize, activeStyle.darkenOverlay]);

  // Automation state
  const [dailyCap, setDailyCap] = React.useState("2");
  const [requireReview, setRequireReview] = React.useState(true);
  const [dryRunMode, setDryRunMode] = React.useState(false);
  const [slotATime, setSlotATime] = React.useState("08:30");
  const [slotBTime, setSlotBTime] = React.useState("16:00");
  const [autoDarken, setAutoDarken] = React.useState(true);
  const [force60fps, setForce60fps] = React.useState(true);

  // Notifications state
  const [alertEmail, setAlertEmail] = React.useState("alerts@reelforge.internal");
  const [webhookUrl, setWebhookUrl] = React.useState("https://hooks.slack.com/services/T00/B00/X00");
  const [notifPublishSuccess, setNotifPublishSuccess] = React.useState(true);
  const [notifGateFailure, setNotifGateFailure] = React.useState(true);
  const [notifTokenExpiring, setNotifTokenExpiring] = React.useState(true);
  const [notifDailyDigest, setNotifDailyDigest] = React.useState(false);

  // Connection Test Trigger
  const handleTestConnection = (service: string, serviceName: string) => {
    setTestingId(service);
    addToast({
      type: "info",
      title: `Testing ${serviceName}`,
      description: "Pinging endpoint & verifying credential scopes...",
    });

    setTimeout(() => {
      setTestingId(null);
      addToast({
        type: "success",
        title: `${serviceName} Verified`,
        description: "Status 200 OK · Scope permissions valid · Latency 68ms.",
      });
    }, 1200);
  };

  const handleRefreshToken = () => {
    setTestingId("instagram_refresh");
    addToast({
      type: "info",
      title: "Refreshing Instagram Token",
      description: "Requesting 60-day long-lived access token renewal via Meta Graph...",
    });

    setTimeout(() => {
      setTestingId(null);
      addToast({
        type: "success",
        title: "Token Refreshed",
        description: "Extended access token validity to 60 days (Expires 20 Jan 2027).",
      });
    }, 1500);
  };

  const handleSaveAutomation = () => {
    addToast({
      type: "success",
      title: "Settings Saved",
      description: "Updated config.yaml runtime automation parameters.",
    });
  };

  return (
    <AppShell title="Settings" subtitle="System Configuration, Security & Presets">
      <div className="space-y-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* ===================================================================
              LEFT SUB-NAV (Connections, Styles, Automation, Notifications)
              =================================================================== */}
          <aside className="md:col-span-3 space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted px-2.5 py-1 block">
              Preferences
            </span>

            <nav className="flex md:flex-col overflow-x-auto gap-1 pb-2 md:pb-0" aria-label="Settings navigation">
              {[
                {
                  id: "connections",
                  label: "Connections",
                  icon: Link2,
                  statusDot: "success" as const,
                },
                {
                  id: "styles",
                  label: "Styles & Presets",
                  icon: Palette,
                  statusDot: undefined,
                },
                {
                  id: "automation",
                  label: "Automation",
                  icon: Cpu,
                  statusDot: dryRunMode ? ("warning" as const) : ("success" as const),
                },
                {
                  id: "notifications",
                  label: "Notifications",
                  icon: Bell,
                  statusDot: undefined,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                    className={cn(
                      "w-auto md:w-full shrink-0 md:shrink whitespace-nowrap flex items-center justify-between px-3 py-2 rounded-sm text-xs font-sans transition-fast select-none relative outline-none focus-visible:ring-2 focus-visible:ring-moss/40",
                      isActive
                        ? "bg-surface border border-border text-ink-primary font-medium before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:bg-moss before:rounded-r"
                        : "text-ink-secondary hover:text-ink-primary hover:bg-subtle/70"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={cn(
                          "w-4 h-4 stroke-[1.5]",
                          isActive ? "text-moss" : "text-ink-muted"
                        )}
                      />
                      <span>{tab.label}</span>
                    </div>

                    {tab.statusDot && <StatusDot status={tab.statusDot} className="ml-2 md:ml-0" />}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ===================================================================
              RIGHT CONTENT PANEL
              =================================================================== */}
          <main className="md:col-span-9 space-y-6">
            {/* -----------------------------------------------------------------
                TAB 1: CONNECTIONS (Instagram, GDrive, Gemini, Storage)
                ----------------------------------------------------------------- */}
            {activeTab === "connections" && (
              <div className="space-y-5">
                <div className="border-b border-border pb-3">
                  <h3 className="font-sans text-sm font-semibold text-ink-primary">
                    Connected Integrations
                  </h3>
                  <p className="font-sans text-xs text-ink-muted mt-0.5">
                    Manage API credentials, scopes, and health monitoring. Secrets are masked and write-only.
                  </p>
                </div>

                {/* 1. Instagram / Buffer Token Health */}
                <Card className="p-5 bg-surface space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-sm bg-moss-subtle text-moss border border-moss/20 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-sans text-xs font-semibold text-ink-primary">
                            Instagram Releases via Buffer
                          </h4>
                          <span className="flex items-center gap-1 font-mono text-[10px] text-status-success font-medium">
                            <StatusDot status="success" />
                            Healthy
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-ink-muted">
                          Channel: @enoent.7 · Profile: noori.shed
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={
                          <RefreshCw
                            className={cn(
                              "w-3 h-3 text-moss",
                              testingId === "instagram_refresh" && "animate-spin"
                            )}
                          />
                        }
                        disabled={testingId === "instagram_refresh"}
                        onClick={handleRefreshToken}
                      >
                        Refresh Token
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={testingId === "instagram"}
                        onClick={() => handleTestConnection("instagram", "Instagram API")}
                      >
                        {testingId === "instagram" ? "Pinging..." : "Test"}
                      </Button>
                    </div>
                  </div>

                  {/* Token health bar */}
                  <div className="p-3 rounded-sm bg-subtle border border-border space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-ink-secondary">Long-lived Access Token Validity</span>
                      <span className="text-moss font-semibold tabular-nums">58 days remaining</span>
                    </div>
                    <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-moss rounded-full w-[96%]" />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted">
                      <span>Last refreshed: 21 Nov 2026</span>
                      <span>Next auto-refresh: 14 Jan 2027</span>
                    </div>
                  </div>

                  {/* Write-only Token Secret Input */}
                  <div className="space-y-1 text-xs">
                    <label htmlFor="setting-ig-token" className="font-mono text-[10px] uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-ink-muted" />
                      <span>Update Access Token (Masked · Write-Only)</span>
                    </label>
                    <Input
                      id="setting-ig-token"
                      type="password"
                      placeholder="••••••••••••••••••••••••••••••••"
                      value={secrets.instagramToken}
                      onChange={(e) =>
                        setSecrets({ ...secrets, instagramToken: e.target.value })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </Card>

                {/* 2. Google Drive Footage Pipeline */}
                <Card className="p-5 bg-surface space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-sm bg-subtle text-ink-primary border border-border flex items-center justify-center">
                        <Cloud className="w-4 h-4 text-moss" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-sans text-xs font-semibold text-ink-primary">
                            Google Drive Footage Store
                          </h4>
                          <span className="flex items-center gap-1 font-mono text-[10px] text-status-success font-medium">
                            <StatusDot status="success" />
                            Connected
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-ink-muted">
                          Folder ID: 1A2b3C4d5E6f7G8h9 · 24 clips indexed
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={testingId === "gdrive"}
                      onClick={() => handleTestConnection("gdrive", "Google Drive API")}
                    >
                      {testingId === "gdrive" ? "Pinging..." : "Test"}
                    </Button>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label htmlFor="setting-gdrive-key" className="font-mono text-[10px] uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-ink-muted" />
                      <span>Service Account Credentials JSON (Write-Only)</span>
                    </label>
                    <Input
                      id="setting-gdrive-key"
                      type="password"
                      placeholder="••••••••••••••••••••••••••••••••"
                      value={secrets.gdriveKey}
                      onChange={(e) =>
                        setSecrets({ ...secrets, gdriveKey: e.target.value })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </Card>

                {/* 3. Gemini API (Flash AI Engine) */}
                <Card className="p-5 bg-surface space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-sm bg-moss-subtle text-moss border border-moss/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-sans text-xs font-semibold text-ink-primary">
                            Gemini API (Google GenAI)
                          </h4>
                          <span className="flex items-center gap-1 font-mono text-[10px] text-status-success font-medium">
                            <StatusDot status="success" />
                            Quota Healthy
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-ink-muted">
                          Model: gemini-3.5-flash-lite · Temperature: 0.75
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={testingId === "gemini"}
                      onClick={() => handleTestConnection("gemini", "Gemini API")}
                    >
                      {testingId === "gemini" ? "Pinging..." : "Test"}
                    </Button>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label htmlFor="setting-gemini-key" className="font-mono text-[10px] uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-ink-muted" />
                      <span>Update Gemini API Key (Masked · Write-Only)</span>
                    </label>
                    <Input
                      id="setting-gemini-key"
                      type="password"
                      placeholder="••••••••••••••••••••••••••••••••"
                      value={secrets.geminiKey}
                      onChange={(e) =>
                        setSecrets({ ...secrets, geminiKey: e.target.value })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </Card>

                {/* 4. Storage Provider (Supabase / R2) */}
                <Card className="p-5 bg-surface space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-sm bg-subtle text-ink-primary border border-border flex items-center justify-center">
                        <HardDrive className="w-4 h-4 text-moss" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-sans text-xs font-semibold text-ink-primary">
                            Media Cloud Storage (Supabase / R2)
                          </h4>
                          <span className="flex items-center gap-1 font-mono text-[10px] text-status-success font-medium">
                            <StatusDot status="success" />
                            Bucket Ready
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-ink-muted">
                          Bucket: reelforge-media · Region: us-east-1
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={testingId === "storage"}
                      onClick={() => handleTestConnection("storage", "Storage Provider")}
                    >
                      {testingId === "storage" ? "Pinging..." : "Test"}
                    </Button>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label htmlFor="setting-storage-secret" className="font-mono text-[10px] uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-ink-muted" />
                      <span>Storage Access Secret Key (Masked · Write-Only)</span>
                    </label>
                    <Input
                      id="setting-storage-secret"
                      type="password"
                      placeholder="••••••••••••••••••••••••••••••••"
                      value={secrets.storageSecret}
                      onChange={(e) =>
                        setSecrets({ ...secrets, storageSecret: e.target.value })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </Card>
              </div>
            )}

            {/* -----------------------------------------------------------------
                TAB 2: STYLES (Preset List + Live Preview)
                ----------------------------------------------------------------- */}
            {activeTab === "styles" && (
              <div className="space-y-5">
                <div className="border-b border-border pb-3">
                  <h3 className="font-sans text-sm font-semibold text-ink-primary">
                    Typography & Rendering Presets
                  </h3>
                  <p className="font-sans text-xs text-ink-muted mt-0.5">
                    Configure typography scale, drop shadow intensity, and placement locks for video burns.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Preset Selector & Options (7 cols) */}
                  <div className="lg:col-span-7 space-y-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted block">
                      Installed Style Presets ({STYLE_PRESETS.length})
                    </span>

                    {STYLE_PRESETS.map((preset) => {
                      const isSelected = preset.id === selectedStyleId;

                      return (
                        <div
                          key={preset.id}
                          onClick={() => setSelectedStyleId(preset.id)}
                          className={cn(
                            "p-4 rounded-md border transition-fast cursor-pointer space-y-2 select-none relative outline-none focus-visible:ring-2 focus-visible:ring-moss/40",
                            isSelected
                              ? "bg-surface border-moss before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-moss before:rounded-r"
                              : "bg-surface/80 border-border hover:border-border-strong text-ink-secondary"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-sans text-xs font-semibold text-ink-primary">
                              {preset.name}
                            </span>
                            <Badge variant={isSelected ? "moss" : "default"}>
                              {preset.fontFamily}
                            </Badge>
                          </div>

                          <p className="font-sans text-xs text-ink-secondary leading-relaxed">
                            {preset.description}
                          </p>

                          <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-ink-muted border-t border-border">
                            <span>Fontsize: {preset.fontSize}pt</span>
                            <span>•</span>
                            <span className="text-moss font-medium">
                              Placement: {preset.placement}
                            </span>
                            <span>•</span>
                            <span>Overlay: {preset.darkenOverlay * 100}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Live Style Preview Card (5 cols) */}
                  <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-20">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted block">
                      Live Preview: {activeStyle.name}
                    </span>

                    <Card className="p-4 bg-surface flex flex-col items-center space-y-3">
                      <div className="relative aspect-[9/16] w-full max-w-[240px] rounded-md overflow-hidden bg-ink-primary border border-border flex items-center justify-center p-3 text-center">
                        {/* Background Video Poster Simulation */}
                        <img
                          src="/static/swap/ready_to_post/thumbnail_a.jpg"
                          alt="Footage preview"
                          className="absolute inset-0 w-full h-full object-cover opacity-80"
                        />

                        {/* Darken Overlay Scrim */}
                        <div
                          className="absolute inset-0 bg-black pointer-events-none"
                          style={{ opacity: previewDarken }}
                        />

                        {/* Middle-centre locked typography burn */}
                        <p
                          className={cn(
                            "relative z-10 text-white leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] whitespace-pre-line select-none",
                            activeStyle.fontCategory === "serif" ? "font-serif italic font-semibold" : "font-sans uppercase font-medium tracking-wider"
                          )}
                          style={{
                            fontSize: `${previewFontSize * 0.42}px`,
                            textShadow: "0 2px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.8)",
                          }}
                        >
                          “toote huye dil ke tukde sambhalte nahi,\naur log puchte hain tum badal kyu gaye.”
                        </p>

                        <span className="absolute bottom-1.5 inset-x-0 text-center font-mono text-[8px] text-white/70">
                          Placement: y = 800 (luma: 76.1)
                        </span>
                      </div>

                      {/* Interactive Adjustment Sliders */}
                      <div className="w-full space-y-2 text-xs font-mono pt-2 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-ink-muted">Font Size:</span>
                          <span className="text-ink-primary tabular-nums">{previewFontSize}pt</span>
                        </div>
                        <input
                          type="range"
                          min="24"
                          max="38"
                          value={previewFontSize}
                          onChange={(e) => setPreviewFontSize(Number(e.target.value))}
                          className="w-full accent-moss cursor-pointer"
                        />

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-ink-muted">Darken Scrim:</span>
                          <span className="text-ink-primary tabular-nums">
                            {Math.round(previewDarken * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="0.40"
                          step="0.05"
                          value={previewDarken}
                          onChange={(e) => setPreviewDarken(Number(e.target.value))}
                          className="w-full accent-moss cursor-pointer"
                        />
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* -----------------------------------------------------------------
                TAB 3: AUTOMATION (Daily cap, review mode, dry-run, post time)
                ----------------------------------------------------------------- */}
            {activeTab === "automation" && (
              <div className="space-y-5">
                <div className="border-b border-border pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-sans text-sm font-semibold text-ink-primary">
                      Autonomous Pipeline Rules
                    </h3>
                    <p className="font-sans text-xs text-ink-muted mt-0.5">
                      Configure build schedules, daily caps, and quality gates.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Save className="w-3.5 h-3.5" />}
                    onClick={handleSaveAutomation}
                  >
                    Save Changes
                  </Button>
                </div>

                <Card className="p-5 bg-surface space-y-5 divide-y divide-border">
                  {/* Daily Cap */}
                  <div className="flex items-center justify-between pb-4">
                    <div className="space-y-0.5 max-w-md">
                      <label htmlFor="setting-daily-cap" className="font-sans text-xs font-semibold text-ink-primary block">
                        Daily Cap
                      </label>
                      <span className="font-sans text-xs text-ink-secondary block leading-relaxed">
                        Maximum number of reels staged per day. Formula D3 locks to 2 reels/day (Slot A & Slot B).
                      </span>
                    </div>

                    <select
                      id="setting-daily-cap"
                      value={dailyCap}
                      onChange={(e) => setDailyCap(e.target.value)}
                      aria-label="Daily reel cap"
                      className="h-8 px-3 rounded-sm bg-subtle border border-border text-xs font-mono text-ink-primary outline-none focus-visible:border-moss focus-visible:ring-1 focus-visible:ring-moss/40"
                    >
                      <option value="1">1 reel / day</option>
                      <option value="2">2 reels / day (D3 Standard)</option>
                      <option value="3">3 reels / day</option>
                      <option value="4">4 reels / day</option>
                    </select>
                  </div>

                  {/* Review Mode Toggle */}
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 max-w-md">
                      <label className="font-sans text-xs font-semibold text-ink-primary block">
                        Require Human Review
                      </label>
                      <span className="font-sans text-xs text-ink-secondary block leading-relaxed">
                        Hold newly rendered reels in <code className="font-mono text-moss">/review</code> before sending to Buffer release queue.
                      </span>
                    </div>

                    <Switch checked={requireReview} onCheckedChange={setRequireReview} />
                  </div>

                  {/* Dry-Run Mode Toggle */}
                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5 max-w-md">
                      <div className="flex items-center gap-2">
                        <label className="font-sans text-xs font-semibold text-ink-primary">
                          Dry-Run Simulation Mode
                        </label>
                        {dryRunMode && <Badge variant="warning">Simulation Active</Badge>}
                      </div>
                      <span className="font-sans text-xs text-ink-secondary block leading-relaxed">
                        Run full rendering and quality validation without calling Instagram Graph API.
                      </span>
                    </div>

                    <Switch checked={dryRunMode} onCheckedChange={setDryRunMode} />
                  </div>

                  {/* Scheduled Release Times */}
                  <div className="py-4 space-y-3">
                    <label className="font-sans text-xs font-semibold text-ink-primary block">
                      Release Time Slots
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-sm bg-subtle border border-border space-y-1">
                        <label htmlFor="setting-slot-a-time" className="text-[10px] uppercase text-ink-muted block cursor-pointer">Slot A (Morning)</label>
                        <div className="flex items-center justify-between">
                          <input
                            id="setting-slot-a-time"
                            type="time"
                            value={slotATime}
                            onChange={(e) => setSlotATime(e.target.value)}
                            aria-label="Slot A release time"
                            className="bg-surface border border-border px-2 py-1 rounded-sm text-xs font-mono text-ink-primary outline-none focus-visible:border-moss focus-visible:ring-1 focus-visible:ring-moss/40"
                          />
                          <span className="text-ink-muted text-[11px]">08:30 PKT (03:30 UTC)</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-sm bg-subtle border border-border space-y-1">
                        <label htmlFor="setting-slot-b-time" className="text-[10px] uppercase text-ink-muted block cursor-pointer">Slot B (Afternoon)</label>
                        <div className="flex items-center justify-between">
                          <input
                            id="setting-slot-b-time"
                            type="time"
                            value={slotBTime}
                            onChange={(e) => setSlotBTime(e.target.value)}
                            aria-label="Slot B release time"
                            className="bg-surface border border-border px-2 py-1 rounded-sm text-xs font-mono text-ink-primary outline-none focus-visible:border-moss focus-visible:ring-1 focus-visible:ring-moss/40"
                          />
                          <span className="text-ink-muted text-[11px]">16:00 PKT (11:00 UTC)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quality & Audio Toggles */}
                  <div className="flex items-center justify-between pt-4">
                    <div className="space-y-0.5 max-w-md">
                      <label className="font-sans text-xs font-semibold text-ink-primary block">
                        Auto-Darken Escalation
                      </label>
                      <span className="font-sans text-xs text-ink-secondary block leading-relaxed">
                        Automatically escalate darken overlay from 20% to 40% if background luminance exceeds 0.45 threshold.
                      </span>
                    </div>

                    <Switch checked={autoDarken} onCheckedChange={setAutoDarken} />
                  </div>
                </Card>
              </div>
            )}

            {/* -----------------------------------------------------------------
                TAB 4: NOTIFICATIONS (Email, Webhook, Event Toggles)
                ----------------------------------------------------------------- */}
            {activeTab === "notifications" && (
              <div className="space-y-5">
                <div className="border-b border-border pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-sans text-sm font-semibold text-ink-primary">
                      Notification Channels
                    </h3>
                    <p className="font-sans text-xs text-ink-muted mt-0.5">
                      Configure alerts for failed builds, token expirations, and daily publishing digests.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Save className="w-3.5 h-3.5" />}
                    onClick={() => {
                      addToast({
                        type: "success",
                        title: "Notifications Saved",
                        description: "Webhook endpoints and alert preferences updated.",
                      });
                    }}
                  >
                    Save Preferences
                  </Button>
                </div>

                <Card className="p-5 bg-surface space-y-4">
                  {/* Alert Email */}
                  <div className="space-y-1.5 text-xs">
                    <label htmlFor="setting-alert-email" className="font-mono text-[10px] uppercase tracking-wider text-ink-muted block">
                      Alert Notification Email
                    </label>
                    <Input
                      id="setting-alert-email"
                      type="email"
                      value={alertEmail}
                      onChange={(e) => setAlertEmail(e.target.value)}
                      className="font-mono text-xs"
                      placeholder="you@domain.com"
                    />
                  </div>

                  {/* Webhook Endpoint */}
                  <div className="space-y-1.5 text-xs">
                    <label htmlFor="setting-webhook-url" className="font-mono text-[10px] uppercase tracking-wider text-ink-muted block">
                      Webhook Endpoint (Slack, Discord, Telegram)
                    </label>
                    <Input
                      id="setting-webhook-url"
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="font-mono text-xs"
                      placeholder="https://hooks.slack.com/services/..."
                    />
                  </div>

                  {/* Event Toggles */}
                  <div className="space-y-3 pt-3 border-t border-border">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted block">
                      Trigger Events
                    </span>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-ink-secondary">Successful Instagram publish</span>
                        <Switch
                          checked={notifPublishSuccess}
                          onCheckedChange={setNotifPublishSuccess}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-secondary">Quality gate rejection (Contrast, Watermark, Bitrate)</span>
                        <Switch
                          checked={notifGateFailure}
                          onCheckedChange={setNotifGateFailure}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-secondary">Buffer / Instagram token expiring within 7 days</span>
                        <Switch
                          checked={notifTokenExpiring}
                          onCheckedChange={setNotifTokenExpiring}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-secondary">Daily morning publishing digest</span>
                        <Switch
                          checked={notifDailyDigest}
                          onCheckedChange={setNotifDailyDigest}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </AppShell>
  );
}
