"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Clock,
  Film,
  Video,
  BookOpen,
  CalendarDays,
  Settings,
  Palette,
  Search,
  Command,
  Plus,
  Menu,
  X,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  CheckSquare,
  Sparkles,
  Send,
  Check,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { THEMES, DEFAULT_THEME_ID, getStoredTheme, setStoredTheme, applyTheme } from "@/lib/themes";
import { Button } from "../ui/button";
import { StatusDot } from "../ui/status-dot";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Workspace", href: "/", icon: LayoutGrid },
  { label: "Review", href: "/review", icon: CheckSquare },
  { label: "Library", href: "/library", icon: Video },
  { label: "Reels", href: "/#reels", icon: Film },
  { label: "Quote Studio", href: "/quotes", icon: BookOpen },
  { label: "Schedule", href: "/schedule", icon: CalendarDays },
  { label: "Publish Log", href: "/publish-log", icon: Send },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Design System", href: "/design", icon: Palette },
];

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onGenerateClick?: () => void;
  onSearchClick?: () => void;
}

export function AppShell({
  children,
  title = "Workspace",
  subtitle,
  onGenerateClick,
  onSearchClick,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [currentTheme, setCurrentTheme] = React.useState<string>(DEFAULT_THEME_ID);
  const [liveDateTime, setLiveDateTime] = React.useState<string>("");

  React.useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const timePart = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setLiveDateTime(`${datePart} · ${timePart}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize active theme from storage & custom events
  React.useEffect(() => {
    const initial = getStoredTheme();
    setCurrentTheme(initial);
    applyTheme(initial);

    const handleThemeChange = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) setCurrentTheme(custom.detail);
    };
    window.addEventListener("instora:theme-changed", handleThemeChange);
    return () => window.removeEventListener("instora:theme-changed", handleThemeChange);
  }, []);

  const activeThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  // Close mobile sidebar when route changes
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-page text-ink-primary font-sans flex flex-col md:flex-row">
      {/* =========================================================================
          1. SLIM LEFT SIDEBAR (Fixed 220px on desktop)
          ========================================================================= */}
      <aside
        className={cn(
          "w-[220px] shrink-0 bg-surface border-r border-border flex flex-col justify-between fixed md:sticky top-0 h-screen z-40 transition-transform duration-150 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header / Brand */}
          <div className="h-14 px-3.5 border-b border-border flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group py-1">
              <img
                src="/logo-mark.png"
                alt="Instora Logo"
                className="w-7 h-7 object-contain shrink-0"
              />
              <div className="flex flex-col">
                <span className="font-serif text-sm font-semibold tracking-tight text-ink-primary leading-tight group-hover:text-moss transition-fast">
                  Instora
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Editorial Platform
                </span>
              </div>
            </Link>

            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden text-ink-muted hover:text-ink-primary p-1"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-2.5 space-y-1 flex-1 overflow-y-auto" aria-label="Main Navigation">
            <div className="px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-ink-muted">
              Platform
            </div>

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center justify-between px-2.5 py-1.5 rounded-sm text-xs transition-fast select-none group outline-none focus-visible:ring-2 focus-visible:ring-moss/40",
                    isActive
                      ? "text-ink-primary font-medium bg-subtle before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:bg-moss before:rounded-r"
                      : "text-ink-secondary hover:text-ink-primary hover:bg-subtle/60"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0 stroke-[1.5]",
                        isActive
                          ? "text-moss"
                          : "text-ink-muted group-hover:text-ink-secondary"
                      )}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-ink-muted">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer: Channel & System Status */}
          <div className="p-3 border-t border-border bg-subtle/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-ink-muted uppercase tracking-wider text-xs">
                Connected Channel
              </span>
              <span className="flex items-center gap-1.5 font-mono text-xs text-status-success font-medium">
                <StatusDot status="success" />
                Active
              </span>
            </div>

            <div className="p-2.5 rounded-sm bg-surface border border-border flex items-center justify-between">
              <div className="flex flex-col min-w-0">
                <span className="font-mono text-xs text-ink-primary truncate font-medium">
                  @enoent.7
                </span>
                <span className="font-mono text-xs text-ink-muted truncate">
                  noori.shed · Buffer
                </span>
              </div>
              <ShieldCheck className="w-3.5 h-3.5 text-moss shrink-0" />
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar (Flat, no blur) */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-ink-primary/25 z-30 md:hidden"
          aria-hidden="true"
        />
      )}

      {/* =========================================================================
          2. MAIN CONTENT AREA WITH SOLID STICKY TOP BAR
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (Solid surface, no frosted glass blur) */}
        <header className="h-14 bg-surface border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
          {/* Left: Mobile hamburger + Page Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-ink-secondary hover:text-ink-primary p-1 -ml-1"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-baseline gap-2.5">
              <h1 className="font-sans text-sm font-semibold text-ink-primary tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <span className="hidden sm:inline font-mono text-xs text-ink-muted">
                  • {subtitle}
                </span>
              )}
            </div>
          </div>

          {/* Right: Live Date/Time Clock, Search / Cmd+K, Action, Account Menu */}
          <div className="flex items-center gap-2.5">
            {/* Live Ticking Date & Time Widget */}
            {liveDateTime && (
              <div
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-subtle border border-border font-mono text-[11px] text-ink-secondary tabular-nums select-none"
                title="Live Local System Time"
              >
                <Clock className="w-3.5 h-3.5 text-moss shrink-0" />
                <span>{liveDateTime}</span>
              </div>
            )}

            {/* Quick Search Button (Cmd+K trigger) */}
            <button
              onClick={onSearchClick}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-subtle border border-border hover:border-border-strong text-xs font-mono text-ink-secondary hover:text-ink-primary transition-fast"
              aria-label="Search or run command (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-ink-muted" />
              <span>Search...</span>
              <kbd className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-surface border border-border text-xs text-ink-muted font-medium ml-1">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </button>

            {/* Primary Action Button: Generate */}
            {onGenerateClick && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={onGenerateClick}
              >
                <span>Generate</span>
              </Button>
            )}

            {/* Quick Theme Switcher (6 Combinations with 2-3 Colors) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-sm border border-border hover:border-border-strong bg-surface transition-fast text-xs outline-none focus-visible:ring-2 focus-visible:ring-moss/40"
                  aria-label="Switch Theme"
                  title={`Active Theme: ${activeThemeObj.name}`}
                >
                  <Palette className="w-3.5 h-3.5 text-moss shrink-0" />
                  <span className="hidden lg:inline font-sans text-xs text-ink-primary font-medium">
                    {activeThemeObj.name}
                  </span>
                  {/* 3 mini color swatch dots */}
                  <span className="flex items-center -space-x-1 shrink-0 ml-0.5">
                    {activeThemeObj.colors.map((c, i) => (
                      <span
                        key={i}
                        className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                  <ChevronDown className="w-3 h-3 text-ink-muted shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 p-1.5 space-y-1">
                <div className="px-2.5 py-1.5 border-b border-border">
                  <p className="font-sans text-xs font-semibold text-ink-primary">Color Themes</p>
                  <p className="font-sans text-[11px] text-ink-muted">6 Curated 3-Color Palettes</p>
                </div>
                {THEMES.map((theme) => {
                  const isSelected = currentTheme === theme.id;
                  return (
                    <DropdownMenuItem
                      key={theme.id}
                      onClick={() => {
                        setCurrentTheme(theme.id);
                        setStoredTheme(theme.id);
                      }}
                      className={cn(
                        "flex items-center justify-between px-2.5 py-2 cursor-pointer rounded-xs transition-fast",
                        isSelected ? "bg-subtle font-medium text-ink-primary" : "hover:bg-subtle/60 text-ink-secondary"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* 3 Color Swatches */}
                        <div className="flex items-center -space-x-1 shrink-0">
                          {theme.colors.map((col, idx) => (
                            <span
                              key={idx}
                              className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-2xs shrink-0"
                              style={{ backgroundColor: col }}
                              title={`${theme.colorLabels[idx]}: ${col}`}
                            />
                          ))}
                        </div>
                        <div className="truncate">
                          <p className="font-sans text-xs text-ink-primary leading-tight truncate">
                            {theme.name}
                          </p>
                          <p className="font-sans text-[10px] text-ink-muted leading-tight truncate">
                            {theme.tagline}
                          </p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-moss shrink-0 ml-1.5" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Account Dropdown Menu (Clean editorial mono representation) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm border border-border hover:border-border-strong bg-surface transition-fast text-xs outline-none focus-visible:ring-2 focus-visible:ring-moss/40"
                  aria-label="Account menu"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-status-success shrink-0" />
                  <span className="font-mono text-xs text-ink-primary font-medium">
                    @enoent.7
                  </span>
                  <ChevronDown className="w-3 h-3 text-ink-muted" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 py-2 border-b border-border">
                  <p className="font-sans text-xs font-medium text-ink-primary">
                    noori.shed
                  </p>
                  <p className="font-mono text-[10px] text-ink-muted">
                    Channel ID: 673...891
                  </p>
                </div>
                <DropdownMenuItem className="gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-moss" />
                  <span>Buffer Credentials</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Settings className="w-3.5 h-3.5 text-ink-muted" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-ink-muted" />
                  <span>View on Instagram</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
