"use client";

import { useTheme, type Theme } from "@/components/ThemeProvider";
import { Check } from "lucide-react";

const THEMES: {
  id: Theme;
  name: string;
  description: string;
  preview: {
    bg: string;
    sidebar: string;
    accent: string;
    text: string;
    subtext: string;
    border: string;
    cardBg?: string;
    cardBorder?: string;
  };
}[] = [
  {
    id: "default",
    name: "SD>Kit Blue",
    description: "Clean SaaS. Slate-blue accent, cool neutral palette.",
    preview: {
      bg: "#f8f9fa",
      sidebar: "#ffffff",
      accent: "#4e55e8",
      text: "#212529",
      subtext: "#868e96",
      border: "#e9ecef",
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Warm cream, coral accent. Service design print culture.",
    preview: {
      bg: "#FAFAF7",
      sidebar: "#F3F0EA",
      accent: "#D4400F",
      text: "#1C1916",
      subtext: "#726860",
      border: "#E8E3D9",
    },
  },
  {
    id: "studio",
    name: "Studio",
    description: "Dark charcoal canvas, golden accent. High-contrast design publication feel.",
    preview: {
      bg: "#242424",
      sidebar: "#181818",
      accent: "#EDB814",
      text: "#F5F0E8",
      subtext: "#8A8680",
      border: "#2E2E2E",
      cardBg: "#ffffff",
      cardBorder: "#e9ecef",
    },
  },
];

function ThemePreview({
  preview,
  active,
}: {
  preview: (typeof THEMES)[0]["preview"];
  active: boolean;
}) {
  const cardBg = preview.cardBg ?? preview.sidebar;
  const cardBorder = preview.cardBorder ?? preview.border;

  return (
    <div
      className="w-full h-24 rounded-lg overflow-hidden flex"
      style={{
        background: preview.bg,
        border: `2px solid ${active ? preview.accent : preview.border}`,
      }}
    >
      {/* Sidebar strip */}
      <div
        className="w-10 h-full flex-shrink-0 flex flex-col gap-1.5 pt-3 px-1.5"
        style={{ background: preview.sidebar, borderRight: `1px solid ${preview.border}` }}
      >
        <div className="w-6 h-1.5 rounded-full" style={{ background: preview.accent }} />
        <div className="w-5 h-1 rounded-full mt-1" style={{ background: preview.subtext, opacity: 0.5 }} />
        <div className="w-4 h-1 rounded-full" style={{ background: preview.subtext, opacity: 0.4 }} />
        <div className="w-5 h-1 rounded-full" style={{ background: preview.subtext, opacity: 0.4 }} />
      </div>

      {/* Main content */}
      <div className="flex-1 p-3 flex flex-col gap-2">
        <div className="h-2 w-20 rounded" style={{ background: preview.text, opacity: 0.85 }} />
        <div className="h-1.5 w-28 rounded" style={{ background: preview.subtext, opacity: 0.5 }} />
        <div className="mt-1 flex gap-2">
          <div
            className="h-10 flex-1 rounded-md"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          />
          <div
            className="h-10 flex-1 rounded-md"
            style={{
              background: cardBg,
              border: `1px solid ${active ? preview.accent : cardBorder}`,
              opacity: 0.7,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => {
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className="text-left group"
          >
            <ThemePreview preview={t.preview} active={active} />

            <div className="mt-2.5 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-neutral-900 flex items-center gap-1.5 flex-wrap">
                  {t.name}
                  {active && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">
                      <Check className="w-2.5 h-2.5" />
                      Active
                    </span>
                  )}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{t.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
