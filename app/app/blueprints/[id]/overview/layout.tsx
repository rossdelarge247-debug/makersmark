import type { ReactNode } from "react";

/**
 * Overview layout — full-width, no sidebar. Mirrors capture mode approach.
 * The top nav is rendered inside OverviewMode.tsx itself.
 */
export default function OverviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      {children}
    </div>
  );
}
