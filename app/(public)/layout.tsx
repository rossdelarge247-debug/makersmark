import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-100">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="text-lg font-semibold text-neutral-900 tracking-tight">
            MakersMark
          </a>
          <div className="flex items-center gap-6">
            <a
              href="/features"
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Features
            </a>
            <a
              href="/how-it-works"
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              How it works
            </a>
            <a
              href="/login"
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Log in
            </a>
            <a
              href="/signup"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              Get started
            </a>
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-neutral-100 py-8">
        <div className="max-w-7xl mx-auto px-6 text-sm text-neutral-500 text-center">
          &copy; {new Date().getFullYear()} MakersMark. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
