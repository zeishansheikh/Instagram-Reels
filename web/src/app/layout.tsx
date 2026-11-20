import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reel Forge — Dusk Editorial Design System",
  description: "A luxury photography & pro cinema design system for automated nature reels.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-canvas text-ink-primary font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
