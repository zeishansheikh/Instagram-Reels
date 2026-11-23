import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Instora — Editorial Nature Reels",
  description: "Automated, quiet, editorial nature reels and publishing platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('instora_theme') || localStorage.getItem('reelforge_theme');
                  if (t) document.documentElement.setAttribute('data-theme', t);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-page text-ink-primary font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
