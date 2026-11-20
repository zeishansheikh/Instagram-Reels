"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  Sliders,
  Check,
  Film,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Trash2,
  RefreshCw,
  Clock,
  MoreVertical,
  Plus,
  Send,
} from "lucide-react";

import {
  Button,
  IconButton,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  StatusDot,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogFooter,
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  ToastProvider,
  useToast,
  TooltipProvider,
  Tooltip,
  Skeleton,
  EmptyState,
  VideoTile,
  QuoteBlock,
  CommandBar,
} from "@/components";

function DesignSystemView() {
  const { addToast } = useToast();

  const [switchChecked, setSwitchChecked] = React.useState(true);
  const [selectValue, setSelectValue] = React.useState("degraaf");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-page text-ink-primary font-sans pb-24">
      {/* 1. Command Bar Component at Top */}
      <CommandBar
        activePreset="degraaf"
        isPublishReady={true}
        onGenerate={() =>
          addToast({
            type: "info",
            title: "CommandBar Action",
            description: "Generate modal triggered via CommandBar.",
          })
        }
        onSearch={() =>
          addToast({
            type: "info",
            title: "Quick Search",
            description: "Opening Cmd+K search palette.",
          })
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 space-y-16">
        {/* Header Rationale & Philosophy */}
        <section className="border-b border-border pb-8 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-moss font-medium">
              F0 Design System · Light Editorial
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-secondary hover:text-ink-primary transition-fast"
            >
              <span>Back to Today Screen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <h1 className="font-sans text-2xl sm:text-3xl font-semibold tracking-tight text-ink-primary">
            Reel Forge Component Catalog
          </h1>
          <p className="font-sans text-sm text-ink-secondary max-w-3xl leading-relaxed">
            Light-theme system inspired by classical Swiss editorial craftsmanship and modern precision pro software
            (Linear, Stripe, Attio). Warm off-white canvas (<code className="font-mono text-xs bg-subtle px-1 py-0.5 rounded-sm">#FAFAF8</code>),
            white surfaces, ink typography (<code className="font-mono text-xs bg-subtle px-1 py-0.5 rounded-sm">#16150F</code>),
            hairline borders (<code className="font-mono text-xs bg-subtle px-1 py-0.5 rounded-sm">#E8E6E1</code>), and ONE botanical accent:
            Deep Moss Green (<code className="font-mono text-xs bg-subtle px-1 py-0.5 rounded-sm">#2F5D50</code>).
          </p>
        </section>

        {/* 1. COLOR & TYPE TOKENS */}
        <section className="space-y-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            01 · Core Palette & Tokens
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { name: "Page Canvas", hex: "#FAFAF8", token: "bg-page", border: true },
              { name: "Surface", hex: "#FFFFFF", token: "bg-surface", border: true },
              { name: "Subtle Container", hex: "#F4F3EF", token: "bg-subtle", border: true },
              { name: "Hairline Border", hex: "#E8E6E1", token: "border", border: true },
              { name: "Ink Primary", hex: "#16150F", token: "text-primary", dark: true },
              { name: "Ink Secondary", hex: "#5C5A53", token: "text-secondary", dark: true },
              { name: "Ink Muted", hex: "#8C8980", token: "text-muted", dark: true },
              { name: "Deep Moss (Accent)", hex: "#2F5D50", token: "accent-moss", dark: true },
            ].map((col) => (
              <div key={col.token} className="space-y-1.5 select-none">
                <div
                  className={`h-14 rounded-sm ${col.border ? "border border-border" : ""}`}
                  style={{ backgroundColor: col.hex }}
                />
                <div className="font-sans text-xs font-medium text-ink-primary">{col.name}</div>
                <div className="font-mono text-[11px] text-ink-muted">{col.hex}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. BUTTONS & ICON BUTTONS */}
        <section className="space-y-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            02 · Button & IconButton
          </h2>

          <div className="p-6 rounded-md border border-border bg-surface space-y-6">
            {/* Primary, Secondary, Ghost variants */}
            <div className="space-y-3">
              <span className="font-mono text-[11px] text-ink-muted block uppercase tracking-wider">
                Variants (Primary, Secondary, Ghost)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="primary" icon={<Sparkles className="w-3.5 h-3.5" />}>
                  With Icon
                </Button>
                <Button variant="secondary" iconRight={<ArrowRight className="w-3.5 h-3.5" />}>
                  Icon Right
                </Button>
              </div>
            </div>

            {/* Sizes: sm, md, lg */}
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="font-mono text-[11px] text-ink-muted block uppercase tracking-wider">
                Sizes (Small: 28px, Medium: 34px, Large: 40px)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" variant="secondary">Small (sm)</Button>
                <Button size="md" variant="secondary">Medium (md)</Button>
                <Button size="lg" variant="secondary">Large (lg)</Button>
                <Button size="sm" variant="primary">Small Primary</Button>
                <Button size="md" variant="primary">Medium Primary</Button>
              </div>
            </div>

            {/* States: Loading & Disabled */}
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="font-mono text-[11px] text-ink-muted block uppercase tracking-wider">
                States (Loading, Disabled)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button loading variant="primary">Loading State</Button>
                <Button loading variant="secondary">Processing</Button>
                <Button disabled variant="primary">Disabled Primary</Button>
                <Button disabled variant="secondary">Disabled Secondary</Button>
              </div>
            </div>

            {/* Icon Buttons */}
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="font-mono text-[11px] text-ink-muted block uppercase tracking-wider">
                IconButton (Accessible label, sm / md / lg)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <IconButton label="Refresh" size="sm" variant="secondary">
                  <RefreshCw className="w-3.5 h-3.5" />
                </IconButton>
                <IconButton label="Generate" size="md" variant="primary">
                  <Sparkles className="w-4 h-4" />
                </IconButton>
                <IconButton label="Options" size="md" variant="secondary">
                  <MoreVertical className="w-4 h-4" />
                </IconButton>
                <IconButton label="Delete" size="md" variant="ghost">
                  <Trash2 className="w-4 h-4 text-status-error" />
                </IconButton>
                <IconButton disabled label="Disabled" size="md" variant="secondary">
                  <Sliders className="w-4 h-4" />
                </IconButton>
              </div>
            </div>
          </div>
        </section>

        {/* 3. INPUT, TEXTAREA & SELECT */}
        <section className="space-y-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            03 · Inputs, Textarea, Select & Switch
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-md border border-border bg-surface">
            {/* Input Fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-sans text-xs font-medium text-ink-primary">Standard Input</label>
                <Input placeholder="Enter theme keyword (e.g. solitude)" />
              </div>

              <div className="space-y-1.5">
                <label className="font-sans text-xs font-medium text-ink-primary">Input with Left Icon</label>
                <Input leftIcon={<Search className="w-3.5 h-3.5" />} placeholder="Filter by quote text..." />
              </div>

              <div className="space-y-1.5">
                <label className="font-sans text-xs font-medium text-ink-primary">Input with Error State</label>
                <Input defaultValue="invalid_prompt" error="Theme keyword cannot contain special characters." />
              </div>

              <div className="space-y-1.5">
                <label className="font-sans text-xs font-medium text-ink-muted">Disabled Input</label>
                <Input disabled defaultValue="read_only_partition_2026-11-20" />
              </div>
            </div>

            {/* Textarea, Select & Switch */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-sans text-xs font-medium text-ink-primary">Textarea</label>
                <Textarea
                  defaultValue="Winter holds promises we cannot yet see in the frozen ground. Take a breath and trust the quiet growth."
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-sans text-xs font-medium text-ink-primary">Select Dropdown</label>
                <Select value={selectValue} onValueChange={setSelectValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose style preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="degraaf">De Graaf (Editorial Serif)</SelectItem>
                    <SelectItem value="serif_quiet">Serif Quiet (Newsreader Light)</SelectItem>
                    <SelectItem value="sans_minimal">Sans Minimal (Geist Clean)</SelectItem>
                    <SelectItem value="random">Random Preset Rotation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <div>
                  <p className="font-sans text-xs font-medium text-ink-primary">Automated Instagram Publish</p>
                  <p className="font-sans text-[11px] text-ink-muted">Dispatch reel automatically at 18:00 UTC</p>
                </div>
                <Switch checked={switchChecked} onCheckedChange={setSwitchChecked} />
              </div>
            </div>
          </div>
        </section>

        {/* 4. BADGE, STATUS DOT & TABS */}
        <section className="space-y-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            04 · Badge, StatusDot & Tabs
          </h2>

          <div className="p-6 rounded-md border border-border bg-surface space-y-6">
            {/* Status Dots */}
            <div className="space-y-3">
              <span className="font-mono text-[11px] text-ink-muted block uppercase tracking-wider">
                StatusDot (6px circles: Success, Warning, Error, Neutral, Pulsing)
              </span>
              <div className="flex items-center gap-6 text-xs font-mono text-ink-secondary">
                <div className="flex items-center gap-1.5">
                  <StatusDot status="success" />
                  <span>Success (#2D6A4F)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusDot status="warning" pulse />
                  <span>Queued (#B26A00 pulse)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusDot status="error" />
                  <span>Error (#9C2A2A)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusDot status="neutral" />
                  <span>Neutral (#8C8980)</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="font-mono text-[11px] text-ink-muted block uppercase tracking-wider">
                Badges (Text + Optional Dot)
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="default">Default Neutral</Badge>
                <Badge variant="moss" dot pulse>Live Rendering</Badge>
                <Badge variant="default" dot dotStatus="success">Approved</Badge>
                <Badge variant="warning" dot pulse>Queued for 18:00</Badge>
                <Badge variant="error" dot>Luminance Check Failed</Badge>
              </div>
            </div>

            {/* Tabs */}
            <div className="space-y-3 pt-3 border-t border-border">
              <span className="font-mono text-[11px] text-ink-muted block uppercase tracking-wider">
                Tabs (Dense navigation)
              </span>
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All Reels (12)</TabsTrigger>
                  <TabsTrigger value="queued">Queued (3)</TabsTrigger>
                  <TabsTrigger value="published">Published (8)</TabsTrigger>
                  <TabsTrigger value="discarded">Discarded (1)</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="p-3 text-xs font-sans text-ink-secondary bg-subtle/40 rounded-sm border border-border">
                  Displaying complete repository archive with dense tabular records.
                </TabsContent>
                <TabsContent value="queued" className="p-3 text-xs font-sans text-ink-secondary bg-subtle/40 rounded-sm border border-border">
                  3 approved reels scheduled for upcoming publication windows.
                </TabsContent>
                <TabsContent value="published" className="p-3 text-xs font-sans text-ink-secondary bg-subtle/40 rounded-sm border border-border">
                  8 reels published live to Meta Graph API.
                </TabsContent>
                <TabsContent value="discarded" className="p-3 text-xs font-sans text-ink-secondary bg-subtle/40 rounded-sm border border-border">
                  1 rejected reel archived in output/_rejected/.
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>

        {/* 5. DENSE TABLE (Tabular Numerals, Sticky Header, Row Hover) */}
        <section className="space-y-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            05 · Dense Table (Tabular Numerals & Row Hover)
          </h2>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quote Text Snippet</TableHead>
                <TableHead>Theme</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Contrast</TableHead>
                <TableHead className="text-right">File Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { id: "001", status: "success", statusText: "Published", quote: "Frost coats the glass tonight, but underneath the sleeping soil...", theme: "Hope", duration: "11.55s", contrast: "0.22", size: "4.78 MB" },
                { id: "002", status: "warning", statusText: "Queued", quote: "Pine needles drop in silence, making room for what is next...", theme: "Solitude", duration: "12.00s", contrast: "0.26", size: "3.52 MB" },
                { id: "003", status: "success", statusText: "Approved", quote: "Moss covers the scars on the stone. Healing happens in the quiet dark...", theme: "Resilience", duration: "08.40s", contrast: "0.24", size: "2.89 MB" },
                { id: "004", status: "error", statusText: "Discarded", quote: "The mountain stands patient against the howling storm...", theme: "Endurance", duration: "07.20s", contrast: "0.09", size: "2.10 MB" },
              ].map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono tabular-nums text-ink-muted">#{row.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={row.status as any} />
                      <span className="font-sans text-xs">{row.statusText}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-sans font-medium text-ink-primary max-w-xs truncate">{row.quote}</TableCell>
                  <TableCell><span className="font-mono text-[11px] text-ink-secondary">#{row.theme.toLowerCase()}</span></TableCell>
                  <TableCell className="font-mono tabular-nums text-right text-ink-secondary">{row.duration}</TableCell>
                  <TableCell className="font-mono tabular-nums text-right text-ink-secondary">{row.contrast}</TableCell>
                  <TableCell className="font-mono tabular-nums text-right text-ink-secondary">{row.size}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* 6. CARD (Flat, Hairline) */}
        <section className="space-y-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            06 · Card (Flat, Hairline, Zero Shadow)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Autonomous Pipeline Config</CardTitle>
                <Badge variant="moss">Active</Badge>
              </CardHeader>
              <CardContent>
                <p className="font-sans text-xs text-ink-secondary leading-relaxed">
                  Generates 10 quotes every morning, validates against the deduplication archive, and renders with CRF 20.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2">
                  <div className="p-2 rounded-sm bg-subtle border border-border">
                    <span className="text-[10px] text-ink-muted uppercase block">Model</span>
                    <span>gemini-3.5-flash-lite</span>
                  </div>
                  <div className="p-2 rounded-sm bg-subtle border border-border">
                    <span className="text-[10px] text-ink-muted uppercase block">Target</span>
                    <span>1080×1920 @ 30fps</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <span className="text-[11px] font-mono text-ink-muted">Next run: Tomorrow 06:00 UTC</span>
                <Button size="sm" variant="ghost">Edit</Button>
              </CardFooter>
            </Card>

            <Card hoverable>
              <CardHeader>
                <CardTitle>Cloudflare R2 Bucket</CardTitle>
                <Badge variant="default" dot dotStatus="success">Ready</Badge>
              </CardHeader>
              <CardContent>
                <p className="font-sans text-xs text-ink-secondary leading-relaxed">
                  Public storage endpoint for serving temporary MP4 media URLs to Meta Graph API media containers.
                </p>
                <div className="p-2.5 rounded-sm bg-subtle border border-border font-mono text-xs text-ink-secondary truncate">
                  pub-3948572.r2.dev/reels/2026-11-20/reel_001.mp4
                </div>
              </CardContent>
              <CardFooter>
                <span className="text-[11px] font-mono text-ink-muted">Bucket: reels (12 objects)</span>
                <Button size="sm" variant="secondary">Test Storage</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* 7. DIALOG, DRAWER & DROPDOWN MENU */}
        <section className="space-y-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            07 · Dialog, Drawer, Dropdown Menu & Popovers
          </h2>

          <div className="p-6 rounded-md border border-border bg-surface flex flex-wrap items-center gap-4">
            {/* Dialog Trigger */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">Open Confirmation Dialog</Button>
              </DialogTrigger>
              <DialogContent title="Publish Reel to Instagram" description="Confirm live media container dispatch via Meta Graph API.">
                <div className="space-y-3 py-2 text-xs font-sans text-ink-secondary">
                  <p>This action will upload the 4.78 MB video to cloud storage and create a live Instagram Reel.</p>
                  <div className="p-2.5 rounded-sm bg-subtle border border-border font-mono text-[11px]">
                    Account: @quietnature.quotes · Schedule: Live Instant
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsDialogOpen(false);
                      addToast({ type: "success", title: "Published", description: "Reel published to Instagram profile." });
                    }}
                  >
                    Confirm Publish
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Drawer Trigger */}
            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <DrawerTrigger asChild>
                <Button variant="secondary">Open Technical Drawer</Button>
              </DrawerTrigger>
              <DrawerContent title="Reel Precheck Inspector" description="Technical metadata and luminance safety metrics.">
                <div className="space-y-4 py-3 text-xs font-sans text-ink-secondary">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-ink-muted">Source Footage</span>
                    <p className="font-mono text-xs text-ink-primary">assets/backgrounds/forest_green.mp4</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-ink-muted">Luminance Contrast</span>
                    <div className="flex items-center gap-2">
                      <StatusDot status="success" />
                      <span className="font-mono text-xs text-status-success">0.24 (Optimal WCAG AA)</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-ink-muted">Safe Margins</span>
                    <div className="flex items-center gap-2">
                      <StatusDot status="success" />
                      <span className="font-mono text-xs text-status-success">Inside 90px Margins (3 Lines)</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <Button size="sm" variant="primary" onClick={() => setIsDrawerOpen(false)}>Done Inspecting</Button>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>

            {/* Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" iconRight={<ChevronDown className="w-3.5 h-3.5" />}>
                  Action Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => addToast({ type: "info", title: "Action", description: "Copied video link" })}>
                  Copy Video Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addToast({ type: "info", title: "Action", description: "Regenerating..." })}>
                  Regenerate Clip
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => addToast({ type: "error", title: "Discarded", description: "Reel moved to _rejected" })}>
                  <span className="text-status-error">Discard Reel</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tooltip Demonstration */}
            <Tooltip content="WCAG AA compliant contrast ratio (minimum 0.18)">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-subtle border border-border text-xs font-mono text-ink-secondary cursor-help">
                <StatusDot status="success" />
                <span>Hover for Tooltip</span>
              </div>
            </Tooltip>

            {/* Toast Triggers */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => addToast({ type: "success", title: "Batch Render Complete", description: "10 reels rendered successfully." })}
            >
              Trigger Toast
            </Button>
          </div>
        </section>

        {/* 8. SKELETON & EMPTY STATE */}
        <section className="space-y-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            08 · Skeleton & EmptyState
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-md border border-border bg-surface">
            {/* Skeleton Loading State */}
            <div className="space-y-4">
              <span className="font-mono text-[11px] text-ink-muted block uppercase tracking-wider">
                Skeleton Loading Blocks
              </span>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-sm" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="w-3/4 h-3 rounded-sm" />
                    <Skeleton className="w-1/2 h-2.5 rounded-sm" />
                  </div>
                </div>
                <Skeleton className="w-full h-20 rounded-md" />
                <div className="flex gap-2">
                  <Skeleton className="w-24 h-7 rounded-sm" />
                  <Skeleton className="w-24 h-7 rounded-sm" />
                </div>
              </div>
            </div>

            {/* Empty State */}
            <div className="space-y-4">
              <span className="font-mono text-[11px] text-ink-muted block uppercase tracking-wider">
                EmptyState (Editorial Layout)
              </span>
              <EmptyState
                title="No Reels in Queue"
                description="Your publication queue is currently clear. Generate a new batch of nature quotes to schedule for 18:00 UTC."
                action={
                  <Button size="sm" variant="primary" icon={<Sparkles className="w-3.5 h-3.5" />}>
                    Generate First Reel
                  </Button>
                }
              />
            </div>
          </div>
        </section>

        {/* 9. VIDEO TILE (9:16, Hover-to-Play, Small Meta Row) */}
        <section className="space-y-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            09 · VideoTile (9:16 Aspect, Hover-to-Play, Bottom Meta Row)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <VideoTile
              quote="Frost coats the glass tonight, but underneath the sleeping soil, a small seed remembers how to reach for spring."
              duration="11.5s"
              resolution="1080×1920"
              status="success"
              statusText="Ready"
              videoSrc="/output/2026-11-20/reel_001/reel.mp4"
              posterSrc="/output/2026-11-20/reel_001/thumbnail.jpg"
            />
            <VideoTile
              quote="Pine needles drop in silence, making room for what is next."
              duration="12.0s"
              resolution="1080×1920"
              status="warning"
              statusText="Queued"
              videoSrc="/output/2026-11-19/reel_002/reel.mp4"
              posterSrc="/output/2026-11-19/reel_002/thumbnail.jpg"
            />
            <VideoTile
              quote="Moss covers the scars on the stone. Healing happens in the quiet dark."
              duration="08.4s"
              resolution="1080×1920"
              status="neutral"
              statusText="Draft"
            />
          </div>
        </section>

        {/* 10. QUOTE BLOCK (Serif, Balanced Line Wrapping, Optical Hanging Punctuation) */}
        <section className="space-y-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            10 · QuoteBlock (Newsreader Serif, Balanced Wrapping, Hanging Punctuation)
          </h2>

          <div className="p-8 rounded-md border border-border bg-surface space-y-8">
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase text-ink-muted tracking-widest block">
                XL Display Quote (Hero Level)
              </span>
              <QuoteBlock
                size="xl"
                author="Reel Forge Curation · Winter Light"
                theme="hope"
              >
                Frost coats the glass tonight, but underneath the sleeping soil, a small seed remembers how to reach for spring.
              </QuoteBlock>
            </div>

            <div className="pt-6 border-t border-border space-y-2">
              <span className="font-mono text-[10px] uppercase text-ink-muted tracking-widest block">
                LG Body Quote
              </span>
              <QuoteBlock
                size="lg"
                author="Marcus Aurelius · Meditations IV"
                theme="resilience"
              >
                Time is a river, a violent current of events, glimpsed once and already carried past us, and another follows and is gone.
              </QuoteBlock>
            </div>

            <div className="pt-6 border-t border-border space-y-2">
              <span className="font-mono text-[10px] uppercase text-ink-muted tracking-widest block">
                MD Sub-Quote
              </span>
              <QuoteBlock
                size="md"
                author="Bashō · Narrow Road to the Deep North"
                theme="solitude"
              >
                Even in Kyoto, hearing the cuckoo’s cry, I long for Kyoto.
              </QuoteBlock>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function DesignPage() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <DesignSystemView />
      </TooltipProvider>
    </ToastProvider>
  );
}
