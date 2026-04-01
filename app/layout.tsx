import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Using Geist (local variable font) — matches Inter's clean, premium SaaS aesthetic.
// The CSS variable --font-sans is referenced in tailwind.config.ts.
const fontSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MakersMark — Service Blueprint Builder",
  description:
    "Design, capture, and share professional service blueprints with your team.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontSans.variable}>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
