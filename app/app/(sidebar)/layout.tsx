import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/supabase/auth-actions";
import { createClient } from "@/lib/supabase/server";
import { getUserProjects } from "@/lib/supabase/project-actions";
import SidebarNav from "./SidebarNav";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [user, projects] = await Promise.all([getUser(), getUserProjects()]);

  const displayEmail = user?.email ?? "Account";
  const initials = displayEmail.slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen flex bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-neutral-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-neutral-100 flex-shrink-0">
          <a href="/app" className="text-lg font-semibold text-neutral-900 tracking-tight">
            {"SD>Kit"}
          </a>
        </div>

        {/* Nav — client component for active state */}
        <SidebarNav projects={projects} />

        {/* User account + sign out */}
        <div className="px-3 py-4 border-t border-neutral-100 space-y-1 flex-shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700 flex-shrink-0">
              {initials}
            </div>
            <span className="truncate text-sm text-neutral-700" title={displayEmail}>
              {displayEmail}
            </span>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              <LogOut className="w-4 h-4 text-neutral-400" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
