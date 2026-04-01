import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-neutral-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-neutral-100">
          <a
            href="/app"
            className="text-lg font-semibold text-neutral-900 tracking-tight"
          >
            MakersMark
          </a>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <a
            href="/app"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Dashboard
          </a>
          <a
            href="/app/blueprints"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Blueprints
          </a>
          <a
            href="/app/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Settings
          </a>
        </nav>
        <div className="px-3 py-4 border-t border-neutral-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700">
              U
            </div>
            <span className="truncate">User account</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
