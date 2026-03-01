"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MessageCircle,
  CheckSquare,
  Activity,
  User,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/home", label: "AI Chat", icon: MessageCircle },
  { href: "/dashboard?tab=tasks", label: "Tasks", icon: CheckSquare, tab: "tasks" },
  { href: "/dashboard?tab=activity", label: "Activity", icon: Activity, tab: "activity" },
  { href: "/dashboard?tab=profile", label: "Profile", icon: User, tab: "profile" },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dashboardTab = searchParams.get("tab") || "tasks";

  return (
    <div className="flex h-screen bg-[hsl(260,27%,96%)]">
      {/* Sidebar - light theme */}
      <aside
        className="w-64 shrink-0 flex flex-col border-r border-border/40"
        style={{
          background:
            "linear-gradient(180deg, hsl(260 27% 96%) 0%, hsl(220 40% 96%) 25%, hsl(250 35% 95%) 50%, hsl(215 45% 95%) 75%, hsl(257 40% 93%) 100%)",
        }}
      >
        <div className="p-4 border-b border-border/40">
          <Link
            href="/home"
            className="text-lg font-bold text-foreground tracking-tight"
          >
            Holdless
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(({ href, label, icon: Icon, tab }) => {
            const isActive =
              href === "/home"
                ? pathname === "/home"
                : pathname === "/dashboard" && (tab ? dashboardTab === tab : false);
            return (
              <Link
                key={href + label}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#6B46C1]/10 text-[#6B46C1]"
                    : "text-foreground hover:bg-muted/50"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isActive ? "text-[#6B46C1]" : "text-foreground"
                  )}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border/40 space-y-3">
          <Link
            href="/dashboard?tab=settings"
            title="Settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-foreground hover:bg-muted/50",
              pathname === "/dashboard" && dashboardTab === "settings"
                ? "bg-[#6B46C1]/10 text-[#6B46C1]"
                : ""
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span>Settings</span>
          </Link>
          <p className="px-3 py-2 text-xs text-muted-foreground leading-tight">
            AI customer service assistant
          </p>
        </div>
      </aside>
      {/* Main content */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 overflow-hidden relative",
          pathname === "/home"
            ? "bg-[hsl(0,0%,98%)]"
            : "bg-[hsl(260,27%,96%)]"
        )}
      >
        {/* Gradient overlay - hidden on chatbot (home) for clean uniform background */}
        {pathname !== "/home" && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        )}
        <div className="relative flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
