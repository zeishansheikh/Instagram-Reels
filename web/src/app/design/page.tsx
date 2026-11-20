"use client";

import * as React from "react";
import {
  Sparkles,
  Sliders,
  Send,
  Eye,
  Trash2,
  RefreshCw,
  Film,
  Compass,
  Layers,
  Check,
  Search,
  Terminal,
} from "lucide-react";
import {
  Button,
  IconButton,
  Input,
  Select,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  StatusDot,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Modal,
  ModalTrigger,
  ModalContent,
  TooltipProvider,
  Tooltip,
  ToastProvider,
  useToast,
  Skeleton,
  EmptyState,
  VideoTile,
  QuoteText,
  CommandBar,
} from "@/components";

function DesignSystemShowcase() {
  const { addToast } = useToast();
  const [switchVal, setSwitchVal] = React.useState(true);
  const [selectVal, setSelectVal] = React.useState("degraaf");
  const [inputVal, setInputVal] = React.useState("Still waters reflect the heavens.");

  const colors = [
    { name: "Canvas", token: "--bg-canvas", hex: "#0F0E0D", desc: "Warm charred umber-black base" },
    { name: "Surface", token: "--bg-surface", hex: "#171514", desc: "Elevated modals & floating panels" },
    { name: "Card", token: "--bg-card", hex: "#1E1C1A", desc: "Containers & media viewports" },
    { name: "Card Hover", token: "--bg-card-hover", hex: "#262321", desc: "Interactive hover lift" },
    { name: "Alpenglow", token: "--accent-alpenglow", hex: "#E88C64", desc: "Signature warm apricot accent" },
    { name: "Alpine Mist", token: "--accent-mist", hex: "#7FA99B", desc: "Glacial blue-sage status indicator" },
    { name: "Dusk Error", token: "--accent-error", hex: "#C76A58", desc: "Muted brick ochre for rejections" },
    { name: "Parchment", token: "--text-primary", hex: "#F5F2ED", desc: "Unbleached warm white ink" },
    { name: "Stone Taupe", token: "--text-secondary", hex: "#A8A199", desc: "Secondary labels and UI chrome" },
    { name: "Dusk Shadow", token: "--text-muted", hex: "#6E6862", desc: "Microcopy and timecode captions" },
  ];

  return (
    <div className="relative min-h-screen pb-28">
      {/* Floating Command Bar */}
      <CommandBar
        activePreset={selectVal}
        isPublishReady={true}
        onGenerate={() => addToast({ type: "info", title: "Batch Generation Triggered", description: "Generating 10 reels with Gemini..." })}
        onReview={() => addToast({ type: "info", title: "Review Mode", description: "Opening interactive review workspace..." })}
        onSearch={() => addToast({ type: "info", title: "Command Palette", description: "Search palette (⌘K) opened." })}
      />

      <main className="max-w-6xl mx-auto px-6 pt-12 space-y-20">
        {/* Header Hero */}
        <section className="space-y-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <Badge variant="alpenglow">Design System v1.0</Badge>
            <span className="text-xs font-mono text-ink-muted">·</span>
            <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">
              Dusk Editorial
            </span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-normal text-ink-primary tracking-tight leading-tight">
            Quiet, Cinematic &amp; Typographic.
          </h1>
          <p className="text-sm sm:text-base text-ink-secondary font-sans leading-relaxed">
            The design language for Reel Forge combines the restraint of luxury photography
            monographs with the precision of film-mastering software. Grounded in warm basalt,
            delicate hairlines, and the blush of alpenglow.
          </p>
        </section>

        {/* 1. Color Tokens */}
        <section className="space-y-6">
          <div className="border-b border-border-subtle/60 pb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl text-ink-primary">1. Color Tokens</h2>
            <span className="text-xs font-mono text-ink-muted">Warm Basalt &amp; Alpenglow</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {colors.map((c) => (
              <div
                key={c.token}
                className="p-3 rounded-[8px] bg-canvas-card border border-border-subtle flex flex-col gap-2.5 transition-all hover:border-border-medium"
              >
                <div
                  className="w-full h-14 rounded-[4px] border border-white/5 shadow-inner"
                  style={{ backgroundColor: c.hex }}
                />
                <div>
                  <h4 className="text-xs font-semibold text-ink-primary font-sans">{c.name}</h4>
                  <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted mt-0.5">
                    <span>{c.hex}</span>
                    <span className="text-[10px] text-alpenglow/80">{c.token}</span>
                  </div>
                  <p className="text-[10px] text-ink-muted/80 mt-1 line-clamp-1">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Typography Scale */}
        <section className="space-y-6">
          <div className="border-b border-border-subtle/60 pb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl text-ink-primary">2. Typographic Cadence</h2>
            <span className="text-xs font-mono text-ink-muted">Newsreader &amp; Plus Jakarta Sans</span>
          </div>

          <Card className="p-8 space-y-8">
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-alpenglow">
                Hero Quote / Newsreader Italic 36px
              </span>
              <QuoteText size="xl" theme="solitude">
                Frost coats the glass tonight, but underneath the sleeping soil, a small seed remembers how to reach for spring.
              </QuoteText>
            </div>

            <div className="space-y-2 border-t border-border-subtle/40 pt-6">
              <span className="text-[10px] font-mono uppercase tracking-widest text-alpenglow">
                Section Heading / Newsreader Normal 24px
              </span>
              <h3 className="font-serif text-2xl font-normal text-ink-primary tracking-tight">
                Quiet Waters &amp; Autumn Larch Reflections
              </h3>
            </div>

            <div className="space-y-2 border-t border-border-subtle/40 pt-6">
              <span className="text-[10px] font-mono uppercase tracking-widest text-alpenglow">
                UI &amp; Body Text / Plus Jakarta Sans 14px &amp; 13px
              </span>
              <p className="text-sm text-ink-secondary leading-relaxed max-w-2xl">
                Background video selection is driven by quote mood matching, ensuring visual
                harmony. If background luminance behind the quote exceeds safe contrast thresholds,
                the engine automatically escalates overlay darkness to 0.45.
              </p>
            </div>

            <div className="space-y-2 border-t border-border-subtle/40 pt-6">
              <span className="text-[10px] font-mono uppercase tracking-widest text-alpenglow">
                Tabular Micro &amp; Timecodes / JetBrains Mono 11px
              </span>
              <div className="flex items-center gap-4 text-xs font-mono text-ink-muted">
                <span>00:08.40 / 30FPS</span>
                <span>·</span>
                <span>1080x1920 (9:16)</span>
                <span>·</span>
                <span>H.264 CRF 20</span>
                <span>·</span>
                <span>LUMINANCE: 0.22 (PASS)</span>
              </div>
            </div>
          </Card>
        </section>

        {/* 3. Action Buttons & Icons */}
        <section className="space-y-6">
          <div className="border-b border-border-subtle/60 pb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl text-ink-primary">3. Action Controls</h2>
            <span className="text-xs font-mono text-ink-muted">Buttons, IconButtons &amp; States</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Primary Buttons */}
            <Card className="space-y-4">
              <CardTitle>Primary Variant</CardTitle>
              <CardDescription>Warm alpenglow background for high-priority user actions.</CardDescription>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button size="sm">Small Action</Button>
                <Button size="md" icon={<Sparkles className="w-3.5 h-3.5" />}>
                  Generate Reel
                </Button>
                <Button size="lg">Large Hero</Button>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-border-subtle/40">
                <Button loading size="sm">
                  Encoding...
                </Button>
                <Button disabled size="sm">
                  Disabled
                </Button>
              </div>
            </Card>

            {/* Ghost Buttons */}
            <Card className="space-y-4">
              <CardTitle>Ghost Variant</CardTitle>
              <CardDescription>Hairline bordered button for secondary options &amp; navigation.</CardDescription>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button variant="ghost" size="sm">
                  Secondary
                </Button>
                <Button variant="ghost" size="md" icon={<Sliders className="w-3.5 h-3.5" />}>
                  Inspect Style
                </Button>
                <Button variant="ghost" size="lg">
                  History
                </Button>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-border-subtle/40">
                <Button variant="ghost" loading size="sm">
                  Fetching...
                </Button>
                <Button variant="ghost" disabled size="sm">
                  Disabled
                </Button>
              </div>
            </Card>

            {/* Quiet & Icon Buttons */}
            <Card className="space-y-4">
              <CardTitle>Quiet &amp; Icon Buttons</CardTitle>
              <CardDescription>Compact, accessible triggers with zero border footprint.</CardDescription>
              <div className="flex items-center gap-3 pt-2">
                <Button variant="quiet" size="md">
                  Discard
                </Button>
                <Button variant="quiet" size="md" icon={<RefreshCw className="w-3.5 h-3.5" />}>
                  Regenerate
                </Button>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-border-subtle/40">
                <Tooltip content="Quick Preview">
                  <IconButton label="Preview" variant="alpenglow">
                    <Eye className="w-4 h-4" />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Edit Settings">
                  <IconButton label="Settings" variant="ghost">
                    <Sliders className="w-4 h-4" />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Delete File">
                  <IconButton label="Delete" variant="quiet">
                    <Trash2 className="w-4 h-4 text-duskerror" />
                  </IconButton>
                </Tooltip>
              </div>
            </Card>
          </div>
        </section>

        {/* 4. Form Controls */}
        <section className="space-y-6">
          <div className="border-b border-border-subtle/60 pb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl text-ink-primary">4. Form &amp; Parameter Controls</h2>
            <span className="text-xs font-mono text-ink-muted">Inputs, Selects, Switches &amp; Tabs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="space-y-5">
              <Input
                label="Custom Quote Prompt"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                hint="Overlaid as 1080x1920 typography with auto-darken contrast escalation."
                leftIcon={<Film className="w-3.5 h-3.5" />}
              />

              <Input
                label="Error State Example"
                defaultValue="Invalid input test string"
                error="Quote exceeds 25 words limit (found 32 words)."
              />

              <div className="pt-2">
                <Select
                  label="Style Preset"
                  value={selectVal}
                  onValueChange={setSelectVal}
                  options={[
                    { label: "De Graaf (Clean Sans, 50px)", value: "degraaf" },
                    { label: "Serif Quiet (Literary, 58px)", value: "serif_quiet" },
                    { label: "Sans Minimal (Nordic Light, 54px)", value: "sans_minimal" },
                  ]}
                />
              </div>
            </Card>

            <Card className="space-y-5">
              <Switch
                label="Automatic Contrast Adaptation"
                description="Sample background luminance and auto-darken overlay up to 0.45 if text contrast is low."
                checked={switchVal}
                onCheckedChange={setSwitchVal}
              />

              <div className="border-t border-border-subtle/40 pt-4">
                <span className="text-xs uppercase tracking-wider font-mono text-ink-muted block mb-2">
                  Content Tabs
                </span>
                <Tabs defaultValue="all">
                  <TabsList>
                    <TabsTrigger value="all">All Reels (12)</TabsTrigger>
                    <TabsTrigger value="ready">Approved (8)</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected (2)</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="text-xs text-ink-secondary">
                    Displaying chronological feed across all date partitions.
                  </TabsContent>
                  <TabsContent value="ready" className="text-xs text-ink-secondary">
                    Displaying 8 approved reels queued for Instagram publication.
                  </TabsContent>
                  <TabsContent value="rejected" className="text-xs text-ink-secondary">
                    Displaying 2 discarded reels safely moved to output/_rejected/.
                  </TabsContent>
                </Tabs>
              </div>

              <div className="border-t border-border-subtle/40 pt-4 flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-ink-muted">Interactive Toast Trigger</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    addToast({
                      type: "success",
                      title: "Published to Instagram",
                      description: "Media container created and published successfully (ID: 180123).",
                    })
                  }
                >
                  Fire Success Toast
                </Button>
              </div>
            </Card>
          </div>
        </section>

        {/* 5. Signature Hero Media: 9:16 VideoTile */}
        <section className="space-y-6">
          <div className="border-b border-border-subtle/60 pb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl text-ink-primary">5. 9:16 Cinematic Video Tiles</h2>
            <span className="text-xs font-mono text-ink-muted">Hover to Play, Optical Overlay &amp; Meta</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <VideoTile
              mood="Snow · Hope"
              duration="11.55s"
              status="published"
              quote="Frost coats the glass tonight, but underneath the sleeping soil, a small seed remembers how to reach for spring."
              onClick={() => addToast({ type: "info", title: "Inspecting Reel 001", description: "WhatsApp Video 2026-11-20 at 6.36.21 AM.mp4" })}
            />

            <VideoTile
              mood="Mountain · Peace"
              duration="08.85s"
              status="ready"
              quote="The mountain teaches us that patience outlives even the longest stormy winter nights."
              onClick={() => addToast({ type: "info", title: "Inspecting Reel 002", description: "Patience in the mountains." })}
            />

            <VideoTile
              mood="Lake · Solitude"
              duration="09.20s"
              status="rendering"
              quote="Quiet waters softly hold the reflection of heavens when the winds finally rest."
              onClick={() => addToast({ type: "info", title: "Encoding in progress", description: "FFmpeg 30fps single-pass filtergraph running." })}
            />
          </div>
        </section>

        {/* 6. Modals, Drawers & Empty States */}
        <section className="space-y-6">
          <div className="border-b border-border-subtle/60 pb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl text-ink-primary">6. Modals, Drawers &amp; Empty States</h2>
            <span className="text-xs font-mono text-ink-muted">Overlay dialogs and zero-data feedback</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Modal & Drawer triggers */}
            <Card className="space-y-4">
              <CardTitle>Dialog Overlays</CardTitle>
              <CardDescription>
                Backdrop-blurred centered dialogs and right-hand inspection drawers.
              </CardDescription>

              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Modal>
                  <ModalTrigger asChild>
                    <Button variant="ghost" size="sm">
                      Open Center Modal
                    </Button>
                  </ModalTrigger>
                  <ModalContent
                    title="Publish Date Partition"
                    description="Confirm Instagram Reels publication for date 2026-11-20."
                  >
                    <div className="space-y-4 py-2 text-xs font-sans text-ink-secondary">
                      <p>
                        This will upload your finished reels to public storage, request media
                        containers via Meta Graph API, and share them to your Instagram profile.
                      </p>
                      <div className="p-3 rounded bg-canvas-card border border-border-subtle font-mono text-[11px] text-alpenglow">
                        audio.mode: royalty_free (baked audio included)
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="quiet" size="sm">
                          Cancel
                        </Button>
                        <Button size="sm">Proceed with Publish</Button>
                      </div>
                    </div>
                  </ModalContent>
                </Modal>

                <Modal>
                  <ModalTrigger asChild>
                    <Button variant="ghost" size="sm">
                      Open Side Drawer
                    </Button>
                  </ModalTrigger>
                  <ModalContent
                    variant="drawer"
                    title="Reel Inspector"
                    description="Detailed technical metadata and luminance parameters."
                  >
                    <div className="space-y-4 py-3 text-xs font-sans text-ink-secondary">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase text-ink-muted">Filename</span>
                        <p className="font-mono text-xs text-ink-primary">reel_001.mp4 (4.78 MB)</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase text-ink-muted">Luminance Contrast</span>
                        <div className="flex items-center gap-2">
                          <StatusDot status="mist" />
                          <span className="font-mono text-xs text-mist">0.22 (Sufficient Contrast)</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase text-ink-muted">Safe Margins</span>
                        <div className="flex items-center gap-2">
                          <StatusDot status="mist" />
                          <span className="font-mono text-xs text-mist">Inside 90px / 4 Lines Max</span>
                        </div>
                      </div>
                    </div>
                  </ModalContent>
                </Modal>
              </div>

              {/* Skeleton loading demo */}
              <div className="pt-4 border-t border-border-subtle/40 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-muted">
                  Skeleton Loading State
                </span>
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-[6px]" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="w-3/4 h-3 rounded" />
                    <Skeleton className="w-1/2 h-2.5 rounded" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Empty State demo */}
            <Card className="p-4">
              <EmptyState
                title="No Reels Generated Yet"
                description="Run the automated generator to create your first set of calm nature reels."
                action={
                  <Button
                    size="sm"
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    onClick={() => addToast({ type: "info", title: "Generate Action", description: "Calling Gemini quote model..." })}
                  >
                    Generate First Batch
                  </Button>
                }
              />
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function DesignPage() {
  return (
    <TooltipProvider>
      <ToastProvider>
        <DesignSystemShowcase />
      </ToastProvider>
    </TooltipProvider>
  );
}
