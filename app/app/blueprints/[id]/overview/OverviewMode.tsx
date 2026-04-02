"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Pencil,
  Plus,
  Sparkles,
  X,
  Check,
  Loader2,
  MapPin,
  User,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Blueprint, Step, Swimlane, Cell } from "@/lib/types/blueprint";

// ---------------------------------------------------------------------------
// Evidence icon inference
// ---------------------------------------------------------------------------

const EVIDENCE_PATTERNS: { pattern: RegExp; icon: string; label: string }[] = [
  { pattern: /phone|call|mobile|voice|hotline/i,         icon: "📞", label: "Phone call" },
  { pattern: /app|application|smartphone/i,              icon: "📱", label: "Mobile app" },
  { pattern: /online|web|portal|website|browser|digital|internet/i, icon: "💻", label: "Digital screen" },
  { pattern: /email|e-mail/i,                            icon: "✉️",  label: "Email" },
  { pattern: /chat|message|sms|text/i,                   icon: "💬", label: "Chat / SMS" },
  { pattern: /paper|form|document|letter|post|mail/i,    icon: "📄", label: "Paper / form" },
  { pattern: /card|payment|atm|terminal/i,               icon: "💳", label: "Payment terminal" },
  { pattern: /branch|office|counter|face|person|desk/i,  icon: "🏢", label: "In-person" },
  { pattern: /kiosk|self.service/i,                      icon: "🖥️",  label: "Self-service kiosk" },
  { pattern: /sign|poster|display|board/i,               icon: "🪧", label: "Signage / display" },
];

function inferEvidence(location: string | null | undefined): { icon: string; label: string } | null {
  if (!location) return null;
  for (const { pattern, icon, label } of EVIDENCE_PATTERNS) {
    if (pattern.test(location)) return { icon, label };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Notation lines — which swimlane pairs get a divider, and what label
// ---------------------------------------------------------------------------

const NOTATION_LINES: Record<string, { label: string; sublabel: string }> = {
  "User actions||Frontstage actions": {
    label: "Line of interaction",
    sublabel: "Customer-facing boundary",
  },
  "Frontstage actions||Backstage actions": {
    label: "Line of visibility",
    sublabel: "What the customer can / cannot see",
  },
};

function notationKey(a: string, b: string) {
  return `${a}||${b}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CellKey = `${string}:${string}`;

function cellKey(stepId: string, swimlaneId: string): CellKey {
  return `${stepId}:${swimlaneId}`;
}

type FlyoutState =
  | { type: "cell"; step: Step; swimlane: Swimlane }
  | { type: "step"; step: Step }
  | { type: "add-swimlane" }
  | null;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OverviewModeProps {
  blueprint: Blueprint;
  initialSteps: Step[];
  initialSwimlanes: Swimlane[];
  initialCells: Cell[];
}

// ---------------------------------------------------------------------------
// OverviewMode
// ---------------------------------------------------------------------------

export default function OverviewMode({
  blueprint,
  initialSteps,
  initialSwimlanes,
  initialCells,
}: OverviewModeProps) {
  const supabase = createClient();

  // ---- Core state ----
  const [steps] = useState<Step[]>(initialSteps);
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>(initialSwimlanes);
  const [cellMap, setCellMap] = useState<Map<CellKey, Cell>>(() => {
    const m = new Map<CellKey, Cell>();
    for (const c of initialCells) m.set(cellKey(c.step_id, c.swimlane_id), c);
    return m;
  });

  // Track AI-seeded cells (by key) so fly-out knows to show suggestion
  const [aiSeededKeys, setAiSeededKeys] = useState<Set<CellKey>>(new Set());

  // ---- Seeding state ----
  const [isSeeding, setIsSeeding] = useState(false);
  const seedAttempted = useRef(false);

  // ---- Title editing ----
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(blueprint.title);
  const [titleSaving, setTitleSaving] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ---- Fly-out state ----
  const [flyout, setFlyout] = useState<FlyoutState>(null);
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  const [flyoutContent, setFlyoutContent] = useState("");
  const [flyoutSaving, setFlyoutSaving] = useState(false);
  const [flyoutAiSuggestion, setFlyoutAiSuggestion] = useState("");
  const [flyoutAiLoading, setFlyoutAiLoading] = useState(false);

  // ---- Add swimlane state ----
  const [newSwimlane, setNewSwimlane] = useState("");
  const [swimlaneSaving, setSwimlaneSaving] = useState(false);
  const [deletingSwimId, setDeletingSwimId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Auto-seed cells on first load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (seedAttempted.current) return;
    if (steps.length === 0) return;
    if (initialCells.length > 0) return; // already have cells

    seedAttempted.current = true;
    setIsSeeding(true);

    fetch("/api/seed-cells", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blueprint, steps, swimlanes }),
    })
      .then((r) => r.json())
      .then(async (data: { cells: { step_index: number; swimlane_index: number; content: string }[] }) => {
        if (!data.cells?.length) return;

        const inserts = data.cells
          .map(({ step_index, swimlane_index, content }) => {
            const step = steps[step_index];
            const swimlane = swimlanes[swimlane_index];
            if (!step || !swimlane || !content.trim()) return null;
            return {
              blueprint_id: blueprint.id,
              step_id: step.id,
              swimlane_id: swimlane.id,
              content: content.trim(),
              updated_at: new Date().toISOString(),
            };
          })
          .filter(Boolean) as {
            blueprint_id: string;
            step_id: string;
            swimlane_id: string;
            content: string;
            updated_at: string;
          }[];

        if (!inserts.length) return;

        const { data: saved } = await supabase
          .from("cells")
          .upsert(inserts, { onConflict: "step_id,swimlane_id" })
          .select("*");

        if (saved) {
          const newMap = new Map(cellMap);
          const newKeys = new Set(aiSeededKeys);
          for (const c of saved as Cell[]) {
            const k = cellKey(c.step_id, c.swimlane_id);
            newMap.set(k, c);
            newKeys.add(k);
          }
          setCellMap(newMap);
          setAiSeededKeys(newKeys);
        }
      })
      .catch(console.error)
      .finally(() => setIsSeeding(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Title editing
  // ---------------------------------------------------------------------------

  function startTitleEdit() {
    setTitleEditing(true);
    setTimeout(() => titleInputRef.current?.focus(), 50);
  }

  async function saveTitleEdit() {
    const trimmed = titleValue.trim();
    if (!trimmed || trimmed === blueprint.title) {
      setTitleEditing(false);
      setTitleValue(blueprint.title);
      return;
    }
    setTitleSaving(true);
    await supabase
      .from("blueprints")
      .update({ title: trimmed, updated_at: new Date().toISOString() })
      .eq("id", blueprint.id);
    setTitleSaving(false);
    setTitleEditing(false);
  }

  // ---------------------------------------------------------------------------
  // Fly-out helpers
  // ---------------------------------------------------------------------------

  function openFlyout(next: FlyoutState) {
    setFlyout(next);
    setFlyoutAiSuggestion("");
    setFlyoutAiLoading(false);

    if (next?.type === "cell") {
      const k = cellKey(next.step.id, next.swimlane.id);
      const existing = cellMap.get(k);
      const content = existing?.content ?? "";
      setFlyoutContent(content);

      // Auto-suggest if empty or AI-seeded
      if (!content || aiSeededKeys.has(k)) {
        setFlyoutAiLoading(true);
        fetch("/api/suggest-cell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: next.step,
            swimlaneName: next.swimlane.name,
            blueprintContext: `${blueprint.primary_user || "Customer"} trying to ${blueprint.user_goal || "complete their goal"}`,
          }),
        })
          .then((r) => r.json())
          .then((d: { content: string }) => setFlyoutAiSuggestion(d.content ?? ""))
          .catch(() => setFlyoutAiSuggestion(""))
          .finally(() => setFlyoutAiLoading(false));
      }
    }

    if (next?.type === "add-swimlane") {
      setNewSwimlane("");
    }

    // Animate in
    setTimeout(() => setFlyoutVisible(true), 10);
  }

  const closeFlyout = useCallback(() => {
    setFlyoutVisible(false);
    setTimeout(() => {
      setFlyout(null);
      setFlyoutContent("");
      setFlyoutAiSuggestion("");
    }, 300);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeFlyout();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeFlyout]);

  // ---------------------------------------------------------------------------
  // Save cell
  // ---------------------------------------------------------------------------

  async function saveCell() {
    if (flyout?.type !== "cell") return;
    setFlyoutSaving(true);

    const { step, swimlane } = flyout;
    const content = flyoutContent.trim();
    const k = cellKey(step.id, swimlane.id);

    const row = {
      blueprint_id: blueprint.id,
      step_id: step.id,
      swimlane_id: swimlane.id,
      content,
      updated_at: new Date().toISOString(),
    };

    const { data } = await supabase
      .from("cells")
      .upsert(row, { onConflict: "step_id,swimlane_id" })
      .select("*")
      .single();

    if (data) {
      const newMap = new Map(cellMap);
      newMap.set(k, data as Cell);
      setCellMap(newMap);

      // Remove from AI-seeded since user has explicitly saved
      const newKeys = new Set(aiSeededKeys);
      newKeys.delete(k);
      setAiSeededKeys(newKeys);
    }

    setFlyoutSaving(false);
    closeFlyout();
  }

  // ---------------------------------------------------------------------------
  // Add swimlane
  // ---------------------------------------------------------------------------

  async function saveNewSwimlane() {
    const name = newSwimlane.trim();
    if (!name) return;
    setSwimlaneSaving(true);

    const orderIndex = swimlanes.length;
    const { data } = await supabase
      .from("swimlanes")
      .insert({
        blueprint_id: blueprint.id,
        name,
        type: "custom",
        order_index: orderIndex,
      })
      .select("*")
      .single();

    if (data) {
      setSwimlanes((prev) => [...prev, data as Swimlane]);
    }

    setSwimlaneSaving(false);
    closeFlyout();
  }

  // ---------------------------------------------------------------------------
  // Delete swimlane
  // ---------------------------------------------------------------------------

  async function deleteSwimlane(id: string) {
    await supabase.from("swimlanes").delete().eq("id", id);
    setSwimlanes((prev) => prev.filter((s) => s.id !== id));
    // Remove all cells for this swimlane from map
    const newMap = new Map<CellKey, Cell>();
    cellMap.forEach((v, k) => {
      if (!k.endsWith(`:${id}`)) newMap.set(k, v);
    });
    setCellMap(newMap);
    setDeletingSwimId(null);
    if (flyout?.type === "cell" && flyout.swimlane.id === id) closeFlyout();
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const CELL_W = 180;
  const CELL_H = 100;
  const LABEL_W = 200;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-screen bg-neutral-50 overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Top nav */}
      {/* ------------------------------------------------------------------ */}
      <nav className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white border-b border-neutral-100 z-10">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors min-w-[120px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          MakersMark
        </Link>

        {/* Blueprint title — centred, inline editable */}
        <div className="flex-1 flex justify-center">
          {titleEditing ? (
            <div className="flex items-center gap-2">
              <input
                ref={titleInputRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitleEdit();
                  if (e.key === "Escape") {
                    setTitleEditing(false);
                    setTitleValue(blueprint.title);
                  }
                }}
                className="text-sm font-semibold text-neutral-900 bg-transparent border-b-2 border-primary-400 focus:outline-none text-center px-1 min-w-[200px]"
              />
              <button
                onClick={saveTitleEdit}
                disabled={titleSaving}
                className="text-xs px-2 py-1 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {titleSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Update"}
              </button>
              <button
                onClick={() => { setTitleEditing(false); setTitleValue(blueprint.title); }}
                className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="group/title flex items-center gap-2 cursor-pointer" onClick={startTitleEdit}>
              <span className="text-sm font-semibold text-neutral-900">{titleValue}</span>
              <Pencil className="w-3 h-3 text-neutral-300 opacity-0 group-hover/title:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        <Link
          href={`/app/blueprints/${blueprint.id}/capture`}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors min-w-[120px] justify-end"
        >
          Capture mode
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Scenario strip */}
      {/* ------------------------------------------------------------------ */}
      {blueprint.scenario && (
        <div className="flex-shrink-0 flex items-center justify-center px-6 py-2 bg-neutral-50 border-b border-neutral-100">
          <p className="text-xs text-neutral-400 italic text-center max-w-2xl leading-relaxed">
            <span className="font-medium text-neutral-500 not-italic">Scenario: </span>
            {blueprint.scenario}
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Seeding banner */}
      {/* ------------------------------------------------------------------ */}
      {isSeeding && (
        <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2 bg-primary-50 border-b border-primary-100 text-xs text-primary-600">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Analysing your journey and populating the blueprint…
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Empty state */}
      {/* ------------------------------------------------------------------ */}
      {steps.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-neutral-100 items-center justify-center mb-5">
              <Plus className="w-5 h-5 text-neutral-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">No steps yet</h2>
            <p className="text-sm text-neutral-400 mb-6">
              Capture some journey steps first — the blueprint will populate automatically.
            </p>
            <Link
              href={`/app/blueprints/${blueprint.id}/capture`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
            >
              Go to capture
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Blueprint grid */}
      {/* ------------------------------------------------------------------ */}
      {steps.length > 0 && (
        <div className="flex-1 overflow-auto">
          <div
            style={{ minWidth: `${LABEL_W + steps.length * CELL_W + 48}px` }}
            className="pb-10"
          >
            {/* Step header row */}
            <div
              className="sticky top-0 z-10 flex bg-white border-b border-neutral-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              {/* Corner cell */}
              <div
                style={{ width: LABEL_W, minWidth: LABEL_W }}
                className="flex-shrink-0 px-4 py-3 border-r border-neutral-100"
              />
              {/* Step columns */}
              {steps.map((step, i) => (
                <div
                  key={step.id}
                  style={{ width: CELL_W, minWidth: CELL_W }}
                  className="flex-shrink-0 px-3 py-2.5 border-r border-neutral-100 cursor-pointer hover:bg-neutral-50 transition-colors group/steph"
                  onClick={() => openFlyout({ type: "step", step })}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-[10px] font-semibold text-neutral-400">{i + 1}</span>
                    {step.actor && (
                      <span className="flex items-center gap-0.5 text-[9px] text-neutral-300 truncate max-w-[100px]">
                        <User className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="truncate">{step.actor}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-neutral-700 leading-snug line-clamp-2">
                    {step.title}
                  </p>
                  {step.location && (
                    <span className="flex items-center gap-0.5 mt-1 text-[9px] text-neutral-300">
                      <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="truncate">{step.location}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Swimlane rows */}
            {swimlanes.map((swimlane, swimIndex) => {
              const prevSwimlane = swimlanes[swimIndex - 1];
              const notation = prevSwimlane
                ? NOTATION_LINES[notationKey(prevSwimlane.name, swimlane.name)]
                : undefined;

              return (
              <div key={swimlane.id}>
              {/* Notation divider */}
              {notation && (
                <div className="flex items-center px-4 py-0" style={{ minWidth: `${LABEL_W + steps.length * CELL_W + 48}px` }}>
                  <div className="flex-1 border-t-2 border-dashed border-neutral-300" />
                  <div className="flex-shrink-0 mx-3 flex flex-col items-center">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest whitespace-nowrap">
                      {notation.label}
                    </span>
                    <span className="text-[9px] text-neutral-300 whitespace-nowrap">
                      {notation.sublabel}
                    </span>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed border-neutral-300" />
                </div>
              )}
              <div className="flex border-b border-neutral-100 group/row">
                {/* Swimlane label */}
                <div
                  style={{ width: LABEL_W, minWidth: LABEL_W }}
                  className="flex-shrink-0 flex items-start justify-between px-4 py-3 border-r border-neutral-100 bg-white sticky left-0 z-[5]"
                >
                  <span className="text-xs font-medium text-neutral-500 leading-snug pt-0.5">
                    {swimlane.name}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    {deletingSwimId === swimlane.id ? (
                      <>
                        <button
                          onClick={() => deleteSwimlane(swimlane.id)}
                          className="w-5 h-5 rounded bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                          title="Confirm delete"
                        >
                          <Check className="w-2.5 h-2.5 text-white" />
                        </button>
                        <button
                          onClick={() => setDeletingSwimId(null)}
                          className="w-5 h-5 rounded bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors text-[9px] text-neutral-500"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeletingSwimId(swimlane.id)}
                        className="w-5 h-5 rounded hover:bg-red-50 flex items-center justify-center transition-colors"
                        title="Delete swimlane"
                      >
                        <Trash2 className="w-2.5 h-2.5 text-neutral-300 hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cells */}
                {steps.map((step) => {
                  const k = cellKey(step.id, swimlane.id);
                  const cell = cellMap.get(k);
                  const isAiSeeded = aiSeededKeys.has(k);
                  const isEvidenceRow = swimlane.name === "Physical / digital evidence";
                  const evidenceHint = isEvidenceRow ? inferEvidence(step.location) : null;

                  return (
                    <div
                      key={step.id}
                      style={{ width: CELL_W, minWidth: CELL_W, minHeight: CELL_H }}
                      onClick={() => openFlyout({ type: "cell", step, swimlane })}
                      className={`flex-shrink-0 border-r border-neutral-100 px-3 py-2.5 cursor-pointer transition-colors group/cell relative ${
                        cell?.content
                          ? "hover:bg-primary-50/40"
                          : "hover:bg-neutral-50"
                      }`}
                    >
                      {/* Evidence icon badge */}
                      {isEvidenceRow && evidenceHint && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="text-sm leading-none">{evidenceHint.icon}</span>
                          <span className="text-[9px] text-neutral-400 font-medium">{evidenceHint.label}</span>
                        </div>
                      )}
                      {cell?.content ? (
                        <>
                          <p className="text-[11px] text-neutral-600 leading-relaxed">
                            {cell.content}
                          </p>
                          {isAiSeeded && (
                            <span className="absolute bottom-1.5 right-2 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                              <Sparkles className="w-2.5 h-2.5 text-primary-300" />
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full min-h-[60px]">
                          <div className="w-6 h-6 rounded-full border border-dashed border-neutral-200 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
                            <Plus className="w-3 h-3 text-neutral-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
            );
            })}

            {/* Add swimlane row */}
            <div className="flex border-b border-neutral-100">
              <div
                style={{ width: LABEL_W, minWidth: LABEL_W }}
                className="flex-shrink-0 px-4 py-3 sticky left-0 bg-neutral-50"
              >
                <button
                  onClick={() => openFlyout({ type: "add-swimlane" })}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-primary-500 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add swimlane
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Fly-out backdrop */}
      {/* ------------------------------------------------------------------ */}
      {flyout && (
        <div
          className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${
            flyoutVisible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeFlyout}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Fly-out panel */}
      {/* ------------------------------------------------------------------ */}
      {flyout && (
        <div
          className={`fixed top-0 right-0 bottom-0 z-50 w-[420px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
            flyoutVisible ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Fly-out header */}
          <div className="flex-shrink-0 flex items-start justify-between px-6 pt-6 pb-4 border-b border-neutral-100">
            <div>
              {flyout.type === "cell" && (
                <>
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-1">
                    {flyout.swimlane.name}
                  </p>
                  <h3 className="text-base font-semibold text-neutral-900 leading-snug">
                    Step {steps.findIndex((s) => s.id === flyout.step.id) + 1}: {flyout.step.title}
                  </h3>
                </>
              )}
              {flyout.type === "step" && (
                <>
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-1">
                    Step {steps.findIndex((s) => s.id === flyout.step.id) + 1}
                  </p>
                  <h3 className="text-base font-semibold text-neutral-900 leading-snug">
                    {flyout.step.title}
                  </h3>
                </>
              )}
              {flyout.type === "add-swimlane" && (
                <h3 className="text-base font-semibold text-neutral-900">Add swimlane</h3>
              )}
            </div>
            <button
              onClick={closeFlyout}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Fly-out body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* ---- Cell editor ---- */}
            {flyout.type === "cell" && (
              <div className="flex flex-col gap-5">
                {/* Step context */}
                <div className="flex flex-wrap gap-2">
                  {flyout.step.actor && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 text-xs text-neutral-500">
                      <User className="w-3 h-3" />
                      {flyout.step.actor}
                    </span>
                  )}
                  {flyout.step.location && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 text-xs text-neutral-500">
                      <MapPin className="w-3 h-3" />
                      {flyout.step.location}
                    </span>
                  )}
                </div>

                {/* Content textarea */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-2">
                    Cell content
                  </label>
                  <textarea
                    value={flyoutContent}
                    onChange={(e) => setFlyoutContent(e.target.value)}
                    rows={4}
                    placeholder="Describe what happens in this cell…"
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 resize-none transition-colors"
                  />
                </div>

                {/* AI suggestion */}
                <div className="rounded-xl bg-primary-50 border border-primary-100 p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                    <span className="text-xs font-semibold text-primary-600">AI suggestion</span>
                  </div>

                  {flyoutAiLoading ? (
                    <div className="flex items-center gap-2 text-xs text-primary-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating suggestion…
                    </div>
                  ) : flyoutAiSuggestion ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-primary-800 leading-relaxed">
                        {flyoutAiSuggestion}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setFlyoutContent(flyoutAiSuggestion)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors font-medium"
                        >
                          Use this
                        </button>
                        <button
                          onClick={() => {
                            setFlyoutAiSuggestion("");
                            setFlyoutAiLoading(true);
                            fetch("/api/suggest-cell", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                step: flyout.step,
                                swimlaneName: flyout.swimlane.name,
                                blueprintContext: `${blueprint.primary_user || "Customer"} trying to ${blueprint.user_goal || "complete their goal"}`,
                              }),
                            })
                              .then((r) => r.json())
                              .then((d: { content: string }) => setFlyoutAiSuggestion(d.content ?? ""))
                              .catch(() => setFlyoutAiSuggestion(""))
                              .finally(() => setFlyoutAiLoading(false));
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-primary-200 text-primary-600 hover:bg-primary-100 transition-colors"
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setFlyoutAiLoading(true);
                        fetch("/api/suggest-cell", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            step: flyout.step,
                            swimlaneName: flyout.swimlane.name,
                            blueprintContext: `${blueprint.primary_user || "Customer"} trying to ${blueprint.user_goal || "complete their goal"}`,
                          }),
                        })
                          .then((r) => r.json())
                          .then((d: { content: string }) => setFlyoutAiSuggestion(d.content ?? ""))
                          .catch(() => setFlyoutAiSuggestion(""))
                          .finally(() => setFlyoutAiLoading(false));
                      }}
                      className="flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-700 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      Generate suggestion
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ---- Step detail ---- */}
            {flyout.type === "step" && (
              <div className="flex flex-col gap-4">
                {flyout.step.description && (
                  <div>
                    <p className="text-xs font-medium text-neutral-400 mb-1">Description</p>
                    <p className="text-sm text-neutral-700 leading-relaxed">
                      {flyout.step.description}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {flyout.step.actor && (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">Actor</p>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 text-xs text-neutral-600">
                        <User className="w-3 h-3" />
                        {flyout.step.actor}
                      </span>
                    </div>
                  )}
                  {flyout.step.location && (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">Location</p>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 text-xs text-neutral-600">
                        <MapPin className="w-3 h-3" />
                        {flyout.step.location}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-2 pt-4 border-t border-neutral-100">
                  <p className="text-xs text-neutral-400 mb-3">
                    Edit this step&apos;s details in capture mode.
                  </p>
                  <Link
                    href={`/app/blueprints/${blueprint.id}/capture`}
                    className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
                  >
                    Go to capture
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* ---- Add swimlane ---- */}
            {flyout.type === "add-swimlane" && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-2">
                    Swimlane name
                  </label>
                  <input
                    autoFocus
                    value={newSwimlane}
                    onChange={(e) => setNewSwimlane(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveNewSwimlane();
                    }}
                    placeholder="e.g. Emotions, Pain points, Opportunities…"
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 transition-colors"
                  />
                </div>
                <p className="text-xs text-neutral-400">
                  The new row will appear below the existing swimlanes.
                </p>
              </div>
            )}
          </div>

          {/* Fly-out footer */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-neutral-100 flex items-center gap-3">
            {flyout.type === "cell" && (
              <>
                <button
                  onClick={saveCell}
                  disabled={flyoutSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {flyoutSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save
                </button>
                <button
                  onClick={closeFlyout}
                  className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
            {flyout.type === "add-swimlane" && (
              <>
                <button
                  onClick={saveNewSwimlane}
                  disabled={swimlaneSaving || !newSwimlane.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {swimlaneSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add swimlane
                </button>
                <button
                  onClick={closeFlyout}
                  className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
            {flyout.type === "step" && (
              <button
                onClick={closeFlyout}
                className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
