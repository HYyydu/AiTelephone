"use client";

import { useRouter } from "next/navigation";

export default function Footer() {
  const router = useRouter();

  return (
    <footer className="border-t border-border/40 bg-muted/20">
      <div className="container max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div
            className="cursor-pointer text-xl font-bold text-foreground"
            onClick={() => router.push("/")}
          >
            Holdless
          </div>
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <span
              className="hover:text-foreground cursor-pointer transition-colors"
              onClick={() => router.push("/home")}
            >
              Dashboard
            </span>
            <span
              className="hover:text-foreground cursor-pointer transition-colors"
              onClick={() => router.push("/auth")}
            >
              Sign In
            </span>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Holdless. Never wait on hold again.
        </div>
      </div>
    </footer>
  );
}
