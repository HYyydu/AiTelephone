"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isCallPage = pathname?.startsWith("/call/");

  return (
    <div className="flex min-h-screen flex-col bg-[hsl(260,27%,96%)]">
      <header className="shrink-0 border-b border-border/40 px-4 py-3">
        <div className="container mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/start"
            className="flex items-center gap-2 text-lg font-bold text-foreground"
          >
            <Phone className="h-5 w-5" />
            Call & transcript test
          </Link>
          {isCallPage && (
            <Link href="/start">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground">
                New call
              </span>
            </Link>
          )}
        </div>
      </header>
      <div className="relative flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
