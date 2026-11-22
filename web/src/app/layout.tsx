import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reel Forge — Editorial Nature Reels",
  description: "Automated, quiet, editorial nature reels and publishing platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-page text-ink-primary font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
