import type { ReactNode } from "react";

/**
 * Capture layout — overrides the app sidebar layout for full-width immersive capture mode.
 * The minimal top bar is rendered inside CaptureMode.tsx itself.
 */
export default function CaptureLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
}
