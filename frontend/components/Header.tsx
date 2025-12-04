"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, User, Activity } from "lucide-react";

interface HeaderProps {
  activeTab: "tasks" | "activity" | "profile";
  onTabChange: (tab: "tasks" | "activity" | "profile") => void;
  pendingTasksCount: number;
}

export function Header({
  activeTab,
  onTabChange,
  pendingTasksCount,
}: HeaderProps) {
  const router = useRouter();
  const [logoError, setLogoError] = useState(false);

  const handleLogoClick = () => {
    router.push("/");
  };

  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10 shadow-md">
      <div className="container max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-0 cursor-pointer"
            onClick={handleLogoClick}
          >
            {logoError ? (
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white font-bold">
                H
              </div>
            ) : (
              <div className="w-16 h-16 relative">
                <Image
                  src="/logo.png"
                  alt="Holdless Logo"
                  fill
                  className="object-contain"
                  priority
                  onError={() => setLogoError(true)}
                />
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Holdless
              </h1>
              <p className="text-sm text-muted-foreground">
                Your AI customer service assistant
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            <Button
              variant={activeTab === "tasks" ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange("tasks")}
              className={`relative ${
                activeTab === "tasks"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                  : ""
              }`}
            >
              Tasks
              {pendingTasksCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {pendingTasksCount}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeTab === "activity" ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange("activity")}
              className={
                activeTab === "activity"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                  : ""
              }
            >
              <Activity className="w-4 h-4" />
              Activity
            </Button>
            <Button
              variant={activeTab === "profile" ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange("profile")}
              className={
                activeTab === "profile"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                  : ""
              }
            >
              <User className="w-4 h-4" />
              Profile
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
