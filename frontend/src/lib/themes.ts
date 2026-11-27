export interface ThemeOption {
  id: string;
  name: string;
  tagline: string;
  isDark: boolean;
  colors: [string, string, string]; // [Primary Accent, Canvas Background, Ink/Contrast]
  colorLabels: [string, string, string];
}

export const THEMES: ThemeOption[] = [
  {
    id: "moss",
    name: "Archival Moss",
    tagline: "Botanical sage & archival linen (Original)",
    isDark: false,
    colors: ["#2F5D50", "#FAFAF8", "#16150F"],
    colorLabels: ["Forest Moss", "Linen Canvas", "Charcoal Ink"],
  },
  {
    id: "terracotta",
    name: "Warm Terracotta",
    tagline: "Mediterranean clay & warm alabaster",
    isDark: false,
    colors: ["#A84A2A", "#FAF7F5", "#241814"],
    colorLabels: ["Earthy Terracotta", "Warm Alabaster", "Espresso Ink"],
  },
  {
    id: "navy",
    name: "Nordic Navy",
    tagline: "Cobalt marine & cool arctic slate",
    isDark: false,
    colors: ["#1D4ED8", "#F8FAFC", "#0F172A"],
    colorLabels: ["Nordic Cobalt", "Arctic Slate", "Midnight Slate"],
  },
  {
    id: "plum",
    name: "Imperial Plum",
    tagline: "Mulberry violet & lavender mist",
    isDark: false,
    colors: ["#7C2D84", "#FAF6FB", "#241029"],
    colorLabels: ["Mulberry Plum", "Lavender Mist", "Blackberry Ink"],
  },
  {
    id: "dune",
    name: "Desert Dune",
    tagline: "Golden sandstone ochre & sun-baked parchment",
    isDark: false,
    colors: ["#8F6423", "#FBF9F4", "#211C14"],
    colorLabels: ["Sandstone Ochre", "Parchment Dune", "Walnut Ink"],
  },
  {
    id: "obsidian",
    name: "Midnight Obsidian",
    tagline: "Deep space onyx & glowing emerald",
    isDark: true,
    colors: ["#10B981", "#0B0F17", "#F8FAFC"],
    colorLabels: ["Emerald Glow", "Obsidian Onyx", "Pure Silver"],
  },
];

export const DEFAULT_THEME_ID = "moss";

export function getStoredTheme(): string {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;
  try {
    return localStorage.getItem("instora_theme") || localStorage.getItem("reelforge_theme") || DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function setStoredTheme(themeId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("instora_theme", themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    window.dispatchEvent(new CustomEvent("instora:theme-changed", { detail: themeId }));
  } catch {
    // ignore local storage errors
  }
}

export function applyTheme(themeId: string): void {
  if (typeof window === "undefined") return;
  document.documentElement.setAttribute("data-theme", themeId);
}

