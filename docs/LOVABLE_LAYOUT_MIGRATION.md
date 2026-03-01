# Changing Your Frontend to a Lovable-Style Layout

This guide suggests how to change your frontend layout to a **Lovable-style** app shell (sidebar + header + main content) without breaking backend integration.

---

## What “Lovable layout” usually means

- **App shell:** Sidebar (or top nav) + header + main content area.
- **Sidebar:** Nav links (e.g. Dashboard, Calls), often collapsible on small screens.
- **Header:** Logo, user menu, sign out.
- **Main:** Page content (your existing dashboard, call detail, etc.).
- **Styling:** Tailwind, often with shadcn-style components (you already use these).

---

## What to keep (do not replace)

- **`frontend/lib/api.ts`** – backend REST client  
- **`frontend/lib/websocket.ts`** – Socket.io client  
- **`frontend/lib/types.ts`** – types  
- **`frontend/contexts/AuthContext.tsx`** – auth state  
- **Page logic** – dashboard data, call detail, create-call flow  
- **Env** – `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`

Only the **visual layout** (shell, sidebar, header) and where **pages are mounted** change.

---

## Suggested approach: add a shared app layout

Use a **route group** so dashboard and call pages share one layout (sidebar + header) without changing URLs.

### 1. Current structure

```
frontend/app/
├── layout.tsx          ← root (AuthProvider, body)
├── page.tsx            ← landing (no sidebar)
├── auth/page.tsx       ← auth (no sidebar)
├── dashboard/page.tsx   ← dashboard
└── call/[id]/page.tsx  ← call detail
```

### 2. Target structure (Lovable-style)

```
frontend/app/
├── layout.tsx              ← root (unchanged: AuthProvider, body)
├── page.tsx                ← landing (unchanged)
├── auth/page.tsx           ← auth (unchanged)
├── (app)/                  ← route group (URLs unchanged)
│   ├── layout.tsx          ← NEW: sidebar + header + main
│   ├── dashboard/
│   │   └── page.tsx        ← move from app/dashboard
│   └── call/
│       └── [id]/
│           └── page.tsx    ← move from app/call
```

- **`(app)`** is a route group: it does not change URLs. So `/dashboard` and `/call/123` stay the same.
- Only **dashboard** and **call** get the new sidebar + header layout; landing and auth stay full-width.

### 3. Step-by-step

#### Step A: Create the app-shell layout and sidebar

1. **Create `frontend/app/(app)/layout.tsx`**

This layout wraps all pages under `(app)` with a sidebar + header + main content:

```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Phone, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard", label: "Calls", icon: Phone }, // or a dedicated /calls list
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-card/50 flex flex-col">
        <div className="p-4 border-b border-border/50">
          <Link href="/" className="font-semibold text-lg text-foreground">
            Holdless
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href + label}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname?.startsWith(href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        {user && (
          <div className="p-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => signOut?.()}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        )}
      </aside>
      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border/50 flex items-center px-4 shrink-0">
          <span className="text-sm text-muted-foreground">
            {user?.email ?? "Not signed in"}
          </span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

2. **Optional: extract sidebar into `frontend/components/AppSidebar.tsx`**  
   Move the `<aside>...</aside>` (and nav items) into a component and import it in `(app)/layout.tsx` so Lovable (or you) can edit the shell in one place.

#### Step B: Move dashboard and call under `(app)`

3. **Move pages into the route group** (so they use the new layout):

- Move **`frontend/app/dashboard/page.tsx`** → **`frontend/app/(app)/dashboard/page.tsx`**
- Move **`frontend/app/call/[id]/page.tsx`** → **`frontend/app/(app)/call/[id]/page.tsx`**

On Next.js, moving files like this keeps URLs the same (`/dashboard`, `/call/123`). Delete the old `app/dashboard` and `app/call` folders after moving.

4. **Adjust dashboard page (optional)**  
   Your dashboard currently uses its own `<Header>` with tabs. You can:
   - **Option 1:** Remove the old full-width header from the dashboard page and rely on the new layout’s sidebar + top header for nav and user.
   - **Option 2:** Keep a simplified header/tabs only for the dashboard content area (e.g. “Tasks | Activity | Profile”) inside the main content.

5. **Call detail page**  
   No URL or data changes needed. It will now render inside the new layout (sidebar + main). Keep `lib/api` and `lib/websocket` usage as-is.

#### Step C: Keep landing and auth outside the app layout

6. **Leave these as-is:**  
   - `app/page.tsx` (landing)  
   - `app/auth/page.tsx`  
   So they continue to use only the root `layout.tsx` (no sidebar).

---

## If you prefer to use a layout built in Lovable

1. **Build the shell in Lovable:** Create a project in Lovable, design the layout (sidebar + header + main content area).
2. **Sync via GitHub:** Connect Lovable to your repo; set the app root to `frontend` (see `docs/LOVABLE_INTEGRATION.md`).
3. **Replace only the shell:** In your repo, replace:
   - `app/(app)/layout.tsx` (and any `AppSidebar` / `AppHeader` components)
   with the layout and components Lovable generates.
4. **Keep:** All of `lib/` (api, websocket, types), `contexts/AuthContext`, and your existing page content (dashboard, call detail). Wire your existing pages into Lovable’s main content area (e.g. `{children}` in the layout).
5. **Env:** In Lovable (or `.env.local`), keep `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` pointing at your backend.

---

## Summary

| Goal | Action |
|------|--------|
| Use a Lovable-style layout (sidebar + header) | Add `app/(app)/layout.tsx` with sidebar + header + main; move `dashboard` and `call` under `(app)`. |
| Keep backend integration | Do not change `lib/api.ts`, `lib/websocket.ts`, or auth. |
| Keep URLs | Use route group `(app)` so `/dashboard` and `/call/[id]` stay the same. |
| Use a layout from Lovable | Build shell in Lovable, sync via GitHub, replace only layout/shell components; keep pages and lib. |

If you tell me whether you want “sidebar + header in my repo” vs “layout from Lovable,” I can give the exact file edits (e.g. create `(app)/layout.tsx` and the move commands) next.
