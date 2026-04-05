import type { ReactNode } from "react";

export default function JourneyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
}
