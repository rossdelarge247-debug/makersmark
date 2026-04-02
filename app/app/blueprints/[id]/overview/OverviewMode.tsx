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
  MessageSquare,
  StickyNote,
  ChevronDown,
  HelpCircle,
  AlertCircle,
  Search,
  Zap,
  Database,
  Star,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Blueprint, Step, Swimlane, Cell, Note, NoteCategory } from "@/lib/types/blueprint";

// ---------------------------------------------------------------------------
// Note category config
// ---------------------------------------------------------------------------

const NOTE_CATEGORIES: Record<NoteCategory, { label: string; textCls: string; bgCls: string; dotCls: string; icon: LucideIcon }> = {
  assumption:       { label: "Assumption",      textCls: "text-amber-700",  bgCls: "bg-amber-50 border-amber-200",   dotCls: "bg-amber-400",  icon: HelpCircle },
  unknown:          { label: "Unknown",          textCls: "text-purple-700", bgCls: "bg-purple-50 border-purple-200", dotCls: "bg-purple-400", icon: AlertCircle },
  research_insight: { label: "Research insight", textCls: "text-blue-700",   bgCls: "bg-blue-50 border-blue-200",     dotCls: "bg-blue-400",   icon: Search },
  pain_point:       { label: "Pain point",       textCls: "text-red-700",    bgCls: "bg-red-50 border-red-200",       dotCls: "bg-red-400",    icon: Zap },
  data:             { label: "Data",             textCls: "text-teal-700",   bgCls: "bg-teal-50 border-teal-200",     dotCls: "bg-teal-400",   icon: Database },
  opportunity:      { label: "Opportunity",      textCls: "text-green-700",  bgCls: "bg-green-50 border-green-200",   dotCls: "bg-green-400",  icon: Star },
};

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
// Column building
// ---------------------------------------------------------------------------

interface ColumnDef {
  id: string;
  title: string;
  isServiceMoment: boolean; // true = named backstage-only phase; false = customer step
  steps: Step[];
  orderIndex: number;
}

function buildColumns(
  steps: Step[],
  primaryUser: string,
  actorRoles: Record<string, "customer" | "frontstage" | "backstage">
): ColumnDef[] {
  const columns = new Map<string, ColumnDef>();

  function getRole(step: Step) {
    const actor = (step.actor?.trim() || primaryUser).toLowerCase();
    return actorRoles[actor] ?? (actor === primaryUser.toLowerCase() ? "customer" : null);
  }

  // First pass: create columns for customer steps
  for (const step of steps) {
    if (getRole(step) === "customer") {
      columns.set(step.id, {
        id: step.id,
        title: step.title,
        isServiceMoment: false,
        steps: [step],
        orderIndex: step.order_index,
      });
    }
  }

  const customerTitles = new Map<string, string>(); // title.lower → column id
  columns.forEach((col) => customerTitles.set(col.title.toLowerCase(), col.id));

  // Second pass: assign internal steps to columns
  for (const step of steps) {
    if (getRole(step) === "customer") continue;

    if (step.service_moment) {
      const lowerMoment = step.service_moment.toLowerCase();
      const customerColId = customerTitles.get(lowerMoment);

      if (customerColId) {
        // Attach to the matching customer step column
        columns.get(customerColId)!.steps.push(step);
      } else {
        // Named service moment column
        const key = `moment::${step.service_moment}`;
        if (!columns.has(key)) {
          columns.set(key, {
            id: key,
            title: step.service_moment,
            isServiceMoment: true,
            steps: [step],
            orderIndex: step.order_index,
          });
        } else {
          const col = columns.get(key)!;
          col.steps.push(step);
          col.orderIndex = Math.min(col.orderIndex, step.order_index);
        }
      }
    } else {
      // Fallback: own column (unassigned internal step)
      columns.set(step.id, {
        id: step.id,
        title: step.title,
        isServiceMoment: true,
        steps: [step],
        orderIndex: step.order_index,
      });
    }
  }

  return Array.from(columns.values()).sort((a, b) => a.orderIndex - b.orderIndex);
}

/** Pick the right step from a column for a given swimlane */
function stepForSwimlane(
  col: ColumnDef,
  swimlane: Swimlane,
  primaryUser: string,
  actorRoles: Record<string, "customer" | "frontstage" | "backstage">
): Step {
  const name = swimlane.name.toLowerCase();
  const getRole = (s: Step) => {
    const actor = (s.actor?.trim() || primaryUser).toLowerCase();
    return actorRoles[actor] ?? (actor === primaryUser.toLowerCase() ? "customer" : null);
  };

  if (name.includes("user action")) {
    return col.steps.find((s) => getRole(s) === "customer") ?? col.steps[0];
  }
  if (name.includes("frontstage")) {
    return col.steps.find((s) => getRole(s) === "frontstage") ?? col.steps[0];
  }
  if (name.includes("backstage")) {
    return col.steps.find((s) => getRole(s) === "backstage") ?? col.steps[0];
  }
  // Evidence / Support / custom → use customer step if present, else first
  return col.steps.find((s) => getRole(s) === "customer") ?? col.steps[0];
}

// ---------------------------------------------------------------------------
// NotesSection sub-component
// ---------------------------------------------------------------------------

interface NotesSectionProps {
  notes: Note[];
  targetType: "step" | "cell";
  targetId: string | null;
  noteAddMode: boolean;
  noteEditId: string | null;
  noteFormCategory: NoteCategory;
  noteFormContent: string;
  noteSaving: boolean;
  onSetAddMode: (v: boolean) => void;
  onSetCategory: (v: NoteCategory) => void;
  onSetContent: (v: string) => void;
  onSave: (targetType: "step" | "cell", targetId: string) => void;
  onDelete: (id: string) => void;
  onStartEdit: (note: Note) => void;
  onCancelEdit: () => void;
}

function NotesSection({
  notes,
  targetType,
  targetId,
  noteAddMode,
  noteEditId,
  noteFormCategory,
  noteFormContent,
  noteSaving,
  onSetAddMode,
  onSetCategory,
  onSetContent,
  onSave,
  onDelete,
  onStartEdit,
  onCancelEdit,
}: NotesSectionProps) {
  const showForm = noteAddMode || noteEditId !== null;

  return (
    <div className="pt-4 border-t border-neutral-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Notes {notes.length > 0 && <span className="text-orange-500">({notes.length})</span>}
        </span>
        {!showForm && targetId && (
          <button
            onClick={() => onSetAddMode(true)}
            className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-primary-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add note
          </button>
        )}
        {!showForm && !targetId && (
          <span className="text-[10px] text-neutral-300">Save cell content first</span>
        )}
      </div>

      {/* Existing notes */}
      {notes.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {notes.map((note) => {
            const cfg = NOTE_CATEGORIES[note.category];
            const isEditing = noteEditId === note.id;
            return (
              <div key={note.id} className={`rounded-xl border p-3 ${cfg.bgCls} ${isEditing ? "ring-2 ring-primary-300" : ""}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.textCls}`}>
                    {cfg.label}
                  </span>
                  {!isEditing && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onStartEdit(note)}
                        className="text-[10px] text-neutral-400 hover:text-neutral-600 transition-colors px-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(note.id)}
                        className="text-[10px] text-neutral-400 hover:text-red-500 transition-colors px-1"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
                <p className={`text-xs leading-relaxed ${cfg.textCls}`}>{note.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && targetId && (
        <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <div>
            <p className="text-[10px] font-medium text-neutral-500 mb-1.5">Category</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(NOTE_CATEGORIES) as [NoteCategory, typeof NOTE_CATEGORIES[NoteCategory]][]).map(([cat, cfg]) => (
                <button
                  key={cat}
                  onClick={() => onSetCategory(cat)}
                  className={`text-[10px] px-2 py-1 rounded-full border font-medium transition-colors ${
                    noteFormCategory === cat
                      ? `${cfg.bgCls} ${cfg.textCls} border-current`
                      : "bg-white text-neutral-400 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            autoFocus
            value={noteFormContent}
            onChange={(e) => onSetContent(e.target.value)}
            rows={3}
            placeholder="Add your note…"
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 resize-none bg-white transition-colors"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSave(targetType, targetId)}
              disabled={noteSaving || !noteFormContent.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 text-white text-xs font-semibold hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {noteSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              {noteEditId ? "Update" : "Save note"}
            </button>
            <button
              onClick={onCancelEdit}
              className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OverviewModeProps {
  blueprint: Blueprint;
  initialSteps: Step[];
  initialSwimlanes: Swimlane[];
  initialCells: Cell[];
  initialNotes: Note[];
}

// ---------------------------------------------------------------------------
// OverviewMode
// ---------------------------------------------------------------------------

export default function OverviewMode({
  blueprint,
  initialSteps,
  initialSwimlanes,
  initialCells,
  initialNotes,
}: OverviewModeProps) {
  const supabase = createClient();

  // ---- Core state ----
  const [steps] = useState<Step[]>(initialSteps);
  const primaryUser = blueprint.primary_user?.trim() || "";
  const actorRolesMap = (blueprint.actor_roles ?? {}) as Record<string, "customer" | "frontstage" | "backstage">;
  if (primaryUser) actorRolesMap[primaryUser.toLowerCase()] = "customer";
  const columns = buildColumns(steps, primaryUser, actorRolesMap);
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

  // ---- Notes state ----
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [noteAddMode, setNoteAddMode] = useState(false);
  const [noteEditId, setNoteEditId] = useState<string | null>(null);
  const [noteFormCategory, setNoteFormCategory] = useState<NoteCategory>("assumption");
  const [noteFormContent, setNoteFormContent] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);
  const [cellNotesExpanded, setCellNotesExpanded] = useState<Set<string>>(new Set());
  const [stepNotesExpanded, setStepNotesExpanded] = useState<Set<string>>(new Set());

  // Derived: count map keyed by target_id
  const noteCountMap = new Map<string, number>();
  for (const n of notes) {
    noteCountMap.set(n.target_id, (noteCountMap.get(n.target_id) ?? 0) + 1);
  }

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
      body: JSON.stringify({ blueprint, steps, swimlanes, actorRoles: blueprint.actor_roles ?? {} }),
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
    resetNoteForm();

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
                    actorRoles: blueprint.actor_roles ?? {},
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
  // Note CRUD
  // ---------------------------------------------------------------------------

  function resetNoteForm() {
    setNoteAddMode(false);
    setNoteEditId(null);
    setNoteFormCategory("assumption");
    setNoteFormContent("");
  }

  async function saveNote(targetType: "step" | "cell", targetId: string) {
    const content = noteFormContent.trim();
    if (!content) return;
    setNoteSaving(true);

    if (noteEditId) {
      // Update existing note
      const { data } = await supabase
        .from("notes")
        .update({ category: noteFormCategory, content, updated_at: new Date().toISOString() })
        .eq("id", noteEditId)
        .select("*")
        .single();
      if (data) {
        setNotes((prev) => prev.map((n) => (n.id === noteEditId ? (data as Note) : n)));
      }
    } else {
      // Create new note
      const { data } = await supabase
        .from("notes")
        .insert({
          blueprint_id: blueprint.id,
          target_type: targetType,
          target_id: targetId,
          category: noteFormCategory,
          content,
          source_type: "user",
        })
        .select("*")
        .single();
      if (data) {
        setNotes((prev) => [...prev, data as Note]);
      }
    }

    setNoteSaving(false);
    resetNoteForm();
  }

  async function deleteNote(id: string) {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  function startEditNote(note: Note) {
    setNoteEditId(note.id);
    setNoteFormCategory(note.category);
    setNoteFormContent(note.content);
    setNoteAddMode(false);
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

        <div className="flex items-center gap-3 min-w-[160px] justify-end">
          <button
            onClick={() => {
              setNotesVisible((v) => !v);
              setCellNotesExpanded(new Set());
              setStepNotesExpanded(new Set());
            }}
            className={`inline-flex items-center gap-1.5 text-xs transition-colors px-2.5 py-1 rounded-lg ${
              notesVisible
                ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            Notes
            {notes.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${notesVisible ? "bg-orange-200 text-orange-700" : "bg-neutral-100 text-neutral-500"}`}>
                {notes.length}
              </span>
            )}
          </button>
          <Link
            href={`/app/blueprints/${blueprint.id}/capture`}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Capture mode
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
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
            style={{ minWidth: `${LABEL_W + columns.length * CELL_W + 48}px` }}
            className="pb-10"
          >
            {/* Column header row */}
            <div className="sticky top-0 z-10 flex bg-white border-b border-neutral-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {/* Corner cell */}
              <div style={{ width: LABEL_W, minWidth: LABEL_W }} className="flex-shrink-0 px-4 py-3 border-r border-neutral-100" />
              {columns.map((col, i) => {
                const primaryStep = col.steps.find((s) => {
                  const actor = (s.actor?.trim() || primaryUser).toLowerCase();
                  return actorRolesMap[actor] === "customer" || actor === primaryUser.toLowerCase();
                }) ?? col.steps[0];
                const stepNotes = notes.filter((n) => n.target_type === "step" && n.target_id === primaryStep.id);
                const stepCatGroups = stepNotes.reduce<Partial<Record<NoteCategory, number>>>((acc, n) => {
                  acc[n.category] = (acc[n.category] ?? 0) + 1;
                  return acc;
                }, {});
                const stepNoteCats = Object.entries(stepCatGroups) as [NoteCategory, number][];
                const showStepNotes = stepNotes.length > 0 && (notesVisible || stepNotesExpanded.has(col.id));
                return (
                  <div
                    key={col.id}
                    style={{ width: CELL_W, minWidth: CELL_W }}
                    className={`flex-shrink-0 px-3 py-2.5 border-r border-neutral-100 cursor-pointer transition-colors group/steph ${
                      col.isServiceMoment
                        ? "bg-neutral-50 hover:bg-neutral-100"
                        : "bg-white hover:bg-neutral-50"
                    }`}
                    onClick={() => openFlyout({ type: "step", step: primaryStep })}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[10px] font-semibold text-neutral-400">{i + 1}</span>
                      <div className="flex items-center gap-1.5">
                        {stepNoteCats.length > 0 && (
                          <div
                            className="flex items-center gap-1.5 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); openFlyout({ type: "step", step: primaryStep }); }}
                          >
                            {stepNoteCats.map(([cat, count]) => {
                              const cfg = NOTE_CATEGORIES[cat];
                              const Icon = cfg.icon;
                              return (
                                <span key={cat} title={cfg.label} className={`inline-flex items-center gap-0.5 ${cfg.textCls}`}>
                                  <Icon className="w-2.5 h-2.5 flex-shrink-0" />
                                  <span className="text-[9px] font-semibold leading-none">{count}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {col.isServiceMoment && (
                          <span className="text-[9px] font-medium text-neutral-300 bg-neutral-100 px-1.5 py-0.5 rounded">
                            ⚙ {col.steps.length} step{col.steps.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] font-semibold text-neutral-700 leading-snug line-clamp-2">
                      {col.title}
                    </p>
                    {primaryStep.location && (
                      <span className="flex items-center gap-0.5 mt-1 text-[9px] text-neutral-300">
                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="truncate">{primaryStep.location}</span>
                      </span>
                    )}

                    {/* Per-step chevron — appears on hover when notes exist */}
                    {stepNotes.length > 0 && (
                      <div
                        className="flex justify-center mt-1 opacity-0 group-hover/steph:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStepNotesExpanded((prev) => {
                            const next = new Set(prev);
                            if (next.has(col.id)) { next.delete(col.id); } else { next.add(col.id); }
                            return next;
                          });
                        }}
                      >
                        <ChevronDown
                          className={`w-3 h-3 text-neutral-300 hover:text-neutral-500 transition-transform duration-200 ${showStepNotes ? "rotate-180" : ""}`}
                        />
                      </div>
                    )}

                    {/* Inline step note cards — slide down */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        showStepNotes ? "max-h-[400px] opacity-100 mt-2" : "max-h-0 opacity-0"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col gap-1.5 pb-1">
                        {stepNotes.map((note) => {
                          const cfg = NOTE_CATEGORIES[note.category];
                          return (
                            <div key={note.id} className={`rounded-lg border px-2 py-1.5 ${cfg.bgCls}`}>
                              <p className={`text-[9px] font-semibold uppercase tracking-wide mb-0.5 ${cfg.textCls}`}>
                                {cfg.label}
                              </p>
                              <p className={`text-[10px] leading-snug ${cfg.textCls}`}>{note.content}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                <div className="flex items-center px-4 py-0" style={{ minWidth: `${LABEL_W + columns.length * CELL_W + 48}px` }}>
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
                        <button onClick={() => deleteSwimlane(swimlane.id)} className="w-5 h-5 rounded bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors" title="Confirm delete">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </button>
                        <button onClick={() => setDeletingSwimId(null)} className="w-5 h-5 rounded bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors text-[9px] text-neutral-500">
                          ✕
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingSwimId(swimlane.id)} className="w-5 h-5 rounded hover:bg-red-50 flex items-center justify-center transition-colors" title="Delete swimlane">
                        <Trash2 className="w-2.5 h-2.5 text-neutral-300 hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cells — one per column */}
                {columns.map((col) => {
                  const step = stepForSwimlane(col, swimlane, primaryUser, actorRolesMap);
                  const k = cellKey(step.id, swimlane.id);
                  const cell = cellMap.get(k);
                  const isAiSeeded = aiSeededKeys.has(k);
                  const isEvidenceRow = swimlane.name === "Physical / digital evidence";
                  const evidenceHint = isEvidenceRow ? inferEvidence(step.location) : null;
                  const cellNotes = cell ? notes.filter((n) => n.target_type === "cell" && n.target_id === cell.id) : [];
                  const showNoteCards = cellNotes.length > 0 && (notesVisible || cellNotesExpanded.has(k));
                  const catGroups = cellNotes.reduce<Partial<Record<NoteCategory, number>>>((acc, n) => {
                    acc[n.category] = (acc[n.category] ?? 0) + 1;
                    return acc;
                  }, {});
                  const noteCats = Object.entries(catGroups) as [NoteCategory, number][];

                  return (
                    <div
                      key={col.id}
                      style={{ width: CELL_W, minWidth: CELL_W, minHeight: CELL_H }}
                      onClick={() => openFlyout({ type: "cell", step, swimlane })}
                      className={`flex-shrink-0 border-r border-neutral-100 px-3 py-2.5 cursor-pointer transition-colors group/cell relative ${
                        col.isServiceMoment ? "bg-neutral-50/50" : ""
                      } ${cell?.content ? "hover:bg-primary-50/40" : "hover:bg-neutral-50"}`}
                    >
                      {isEvidenceRow && evidenceHint && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="text-sm leading-none">{evidenceHint.icon}</span>
                          <span className="text-[9px] text-neutral-400 font-medium">{evidenceHint.label}</span>
                        </div>
                      )}
                      {cell?.content ? (
                        <>
                          <p className="text-[11px] text-neutral-600 leading-relaxed">{cell.content}</p>
                          <div className="absolute bottom-1.5 right-2 flex items-center gap-1">
                            {noteCats.length > 0 && (
                              <div
                                className="flex items-center gap-1.5 cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); openFlyout({ type: "cell", step, swimlane }); }}
                              >
                                {noteCats.map(([cat, count]) => {
                                  const cfg = NOTE_CATEGORIES[cat];
                                  const Icon = cfg.icon;
                                  return (
                                    <span
                                      key={cat}
                                      title={cfg.label}
                                      className={`inline-flex items-center gap-0.5 ${cfg.textCls}`}
                                    >
                                      <Icon className="w-2.5 h-2.5 flex-shrink-0" />
                                      <span className="text-[9px] font-semibold leading-none">{count}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            {isAiSeeded && (
                              <span className="opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                <Sparkles className="w-2.5 h-2.5 text-primary-300" />
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full min-h-[60px]">
                          <div className="w-6 h-6 rounded-full border border-dashed border-neutral-200 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
                            <Plus className="w-3 h-3 text-neutral-400" />
                          </div>
                        </div>
                      )}

                      {/* Per-cell chevron — appears on hover when notes exist */}
                      {cellNotes.length > 0 && (
                        <div
                          className="flex justify-center mt-1 opacity-0 group-hover/cell:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCellNotesExpanded((prev) => {
                              const next = new Set(prev);
                              if (next.has(k)) { next.delete(k); } else { next.add(k); }
                              return next;
                            });
                          }}
                        >
                          <ChevronDown
                            className={`w-3 h-3 text-neutral-300 hover:text-neutral-500 transition-transform duration-200 ${showNoteCards ? "rotate-180" : ""}`}
                          />
                        </div>
                      )}

                      {/* Inline note cards — slide down */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          showNoteCards ? "max-h-[400px] opacity-100 mt-2" : "max-h-0 opacity-0"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-col gap-1.5 pb-1">
                          {cellNotes.map((note) => {
                            const cfg = NOTE_CATEGORIES[note.category];
                            return (
                              <div key={note.id} className={`rounded-lg border px-2 py-1.5 ${cfg.bgCls}`}>
                                <p className={`text-[9px] font-semibold uppercase tracking-wide mb-0.5 ${cfg.textCls}`}>
                                  {cfg.label}
                                </p>
                                <p className={`text-[10px] leading-snug ${cfg.textCls}`}>{note.content}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
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
                    actorRoles: blueprint.actor_roles ?? {},
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
                    actorRoles: blueprint.actor_roles ?? {},
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

                {/* Notes section */}
                {(() => {
                  const cellId = cellMap.get(cellKey(flyout.step.id, flyout.swimlane.id))?.id;
                  const targetNotes = cellId ? notes.filter((n) => n.target_type === "cell" && n.target_id === cellId) : [];
                  return (
                    <NotesSection
                      notes={targetNotes}
                      targetType="cell"
                      targetId={cellId ?? null}
                      noteAddMode={noteAddMode}
                      noteEditId={noteEditId}
                      noteFormCategory={noteFormCategory}
                      noteFormContent={noteFormContent}
                      noteSaving={noteSaving}
                      onSetAddMode={setNoteAddMode}
                      onSetCategory={setNoteFormCategory}
                      onSetContent={setNoteFormContent}
                      onSave={saveNote}
                      onDelete={deleteNote}
                      onStartEdit={startEditNote}
                      onCancelEdit={resetNoteForm}
                    />
                  );
                })()}
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

                {/* Notes section */}
                <NotesSection
                  notes={notes.filter((n) => n.target_type === "step" && n.target_id === flyout.step.id)}
                  targetType="step"
                  targetId={flyout.step.id}
                  noteAddMode={noteAddMode}
                  noteEditId={noteEditId}
                  noteFormCategory={noteFormCategory}
                  noteFormContent={noteFormContent}
                  noteSaving={noteSaving}
                  onSetAddMode={setNoteAddMode}
                  onSetCategory={setNoteFormCategory}
                  onSetContent={setNoteFormContent}
                  onSave={saveNote}
                  onDelete={deleteNote}
                  onStartEdit={startEditNote}
                  onCancelEdit={resetNoteForm}
                />
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
