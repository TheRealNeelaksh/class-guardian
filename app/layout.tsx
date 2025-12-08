import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, CalendarDays, LayoutDashboard, ListChecks, Settings } from "lucide-react";
import { Geist, Geist_Mono } from "next/font/google";

import { cn } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/study", label: "Study", icon: BookOpenCheck },
  { href: "/planner", label: "Planner", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export const metadata: Metadata = {
  title: "ClassGuard",
  description: "ClassGuard helps students stay organized.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192x192.png",
    shortcut: "/favicon.ico",
    apple: "/icons/icon-192x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={cn(
          "flex min-h-screen flex-col bg-background font-sans text-foreground antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">
            <div className="container flex-1 py-8">{children}</div>
          </main>
          <nav className="border-t bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="container flex items-center justify-between gap-2 text-xs font-medium sm:text-sm">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link
                  aria-label={`Navigate to ${label}`}
                  key={href}
                  href={href}
                  className="flex flex-1 flex-col items-center gap-1 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </body>
    </html>
  );
}
