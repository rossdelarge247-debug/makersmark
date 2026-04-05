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
  ChevronRight,
  HelpCircle,
  AlertCircle,
  Search,
  Zap,
  Database,
  Star,
  Film,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Blueprint, BlueprintStep as Step, Swimlane, Cell, Note, NoteCategory, AISuggestionItem, InterrogationGroupType, Visual } from "@/lib/types/blueprint";

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
// Interrogation group config
// ---------------------------------------------------------------------------

const INTERROGATION_GROUPS: Record<
  InterrogationGroupType,
  { label: string; icon: LucideIcon; bgCls: string; textCls: string; borderCls: string }
> = {
  consideration:    { label: "Missing considerations", icon: HelpCircle,   bgCls: "bg-amber-50",  textCls: "text-amber-700",  borderCls: "border-amber-200"  },
  research_question:{ label: "Research questions",     icon: Search,        bgCls: "bg-blue-50",   textCls: "text-blue-700",   borderCls: "border-blue-200"   },
  assumption:       { label: "Assumptions to validate",icon: AlertCircle,   bgCls: "bg-purple-50", textCls: "text-purple-700", borderCls: "border-purple-200" },
  risk:             { label: "Risks & dependencies",   icon: Zap,           bgCls: "bg-red-50",    textCls: "text-red-700",    borderCls: "border-red-200"    },
  opportunity:      { label: "Opportunities",          icon: Star,          bgCls: "bg-green-50",  textCls: "text-green-700",  borderCls: "border-green-200"  },
};

const GROUP_TO_NOTE_CATEGORY: Record<InterrogationGroupType, NoteCategory> = {
  consideration:     "assumption",
  research_question: "unknown",
  assumption:        "assumption",
  risk:              "pain_point",
  opportunity:       "opportunity",
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
  | { type: "add-step" }
  | { type: "actor"; name: string; role: "customer" | "frontstage" | "backstage" }
  | { type: "interrogation"; targetType: "step" | "cell"; step: Step; swimlane?: Swimlane }
  | { type: "visual"; step: Step }
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
// Relative time helper
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// Role display config
const ROLE_STYLE: Record<"customer" | "frontstage" | "backstage", { label: string; cls: string }> = {
  customer:   { label: "Customer",   cls: "bg-blue-50 text-blue-700 border-blue-200" },
  frontstage: { label: "Frontstage", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  backstage:  { label: "Backstage",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

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
  onReply: (parentNote: Note, content: string) => Promise<Note | null>;
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
  onReply,
}: NotesSectionProps) {
  const [replyToNoteId, setReplyToNoteId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySaving, setReplySaving] = useState(false);

  async function handleSaveReply(parentNote: Note) {
    if (!replyText.trim() || replySaving) return;
    setReplySaving(true);
    await onReply(parentNote, replyText.trim());
    setReplyText("");
    setReplyToNoteId(null);
    setReplySaving(false);
  }

  const showForm = noteAddMode || noteEditId !== null;
  const topLevelNotes = notes.filter((n) => !n.parent_note_id);
  const getReplies = (noteId: string) => notes.filter((n) => n.parent_note_id === noteId);

  return (
    <div className="pt-4 border-t border-neutral-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Notes {topLevelNotes.length > 0 && <span className="text-orange-500">({topLevelNotes.length})</span>}
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

      {/* Notes with nested replies */}
      {topLevelNotes.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {topLevelNotes.map((note) => {
            const cfg = NOTE_CATEGORIES[note.category];
            const isEditing = noteEditId === note.id;
            const isReplying = replyToNoteId === note.id;
            const replies = getReplies(note.id);
            const noteRef = `#${note.id.replace(/-/g, "").substring(0, 6).toUpperCase()}`;

            return (
              <div key={note.id} className={`rounded-xl border p-3 ${cfg.bgCls} ${isEditing ? "ring-2 ring-primary-300" : ""}`}>
                {/* Note header */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.textCls}`}>
                    {cfg.label}
                    {note.source_type === "ai_accept" && (
                      <span className="ml-1.5 normal-case font-normal opacity-60">· AI</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[8px] font-mono text-neutral-300 mr-1">{noteRef}</span>
                    {!isEditing && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
                <p className={`text-xs leading-relaxed ${cfg.textCls}`}>{note.content}</p>

                {/* Existing replies */}
                {replies.length > 0 && (
                  <div className="mt-2 ml-2 pl-2.5 border-l-2 border-neutral-200 flex flex-col gap-1.5">
                    {replies.map((reply) => (
                      <div key={reply.id} className="bg-white/70 rounded-lg px-2.5 py-2">
                        <div className="flex items-start justify-between gap-1 mb-0.5">
                          <span className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wide">
                            {reply.source_type === "ai_response" ? "AI answer" : "Reply"}
                          </span>
                          <button
                            onClick={() => onDelete(reply.id)}
                            className="text-neutral-300 hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-neutral-600 leading-relaxed">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply form */}
                {isReplying && (
                  <div className="mt-2 ml-2 pl-2.5 border-l-2 border-primary-200">
                    <textarea
                      autoFocus
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                      placeholder="Your reply…"
                      className="w-full px-2.5 py-2 rounded-lg border border-neutral-200 text-xs text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 resize-none bg-white transition-colors"
                    />
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={() => handleSaveReply(note)}
                        disabled={replySaving || !replyText.trim()}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 text-white text-[11px] font-semibold hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {replySaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Save reply
                      </button>
                      <button
                        onClick={() => { setReplyToNoteId(null); setReplyText(""); }}
                        className="text-[11px] text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Reply trigger */}
                {!isEditing && !isReplying && (
                  <button
                    onClick={() => { setReplyToNoteId(note.id); setReplyText(""); onCancelEdit(); }}
                    className={`mt-1.5 text-[10px] font-medium transition-colors ${cfg.textCls} opacity-50 hover:opacity-100`}
                  >
                    + Reply
                  </button>
                )}
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
  initialVisuals: Visual[];
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
  initialVisuals,
}: OverviewModeProps) {
  const supabase = createClient();

  // ---- Core state ----
  const [steps, setSteps] = useState<Step[]>(initialSteps);
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
  const defaultTitle = blueprint.name || (blueprint.type === "as_is" ? "As-is blueprint" : "To-be blueprint");
  const [titleValue, setTitleValue] = useState(defaultTitle);
  const [titleSaving, setTitleSaving] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ---- Scenario editing ----
  const [scenarioEditing, setScenarioEditing] = useState(false);
  const [scenarioValue, setScenarioValue] = useState(blueprint.scenario ?? "");
  const [scenarioSaving, setScenarioSaving] = useState(false);
  const scenarioInputRef = useRef<HTMLTextAreaElement>(null);

  // ---- Last edited tracking ----
  const [lastEdited, setLastEdited] = useState(blueprint.updated_at);

  // ---- Fly-out state ----
  const [flyout, setFlyout] = useState<FlyoutState>(null);
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  const [flyoutContent, setFlyoutContent] = useState("");
  const [flyoutSaving, setFlyoutSaving] = useState(false);
  const [cellTitleEditing, setCellTitleEditing] = useState(false);

  // ---- Add swimlane state ----
  const [newSwimlane, setNewSwimlane] = useState("");
  const [swimlaneSaving, setSwimlaneSaving] = useState(false);
  const [deletingSwimId, setDeletingSwimId] = useState<string | null>(null);

  // ---- Add step state ----
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepSaving, setNewStepSaving] = useState(false);

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

  // ---- Visuals state ----
  const [visualMap, setVisualMap] = useState<Map<string, Visual>>(() => {
    const m = new Map<string, Visual>();
    for (const v of initialVisuals) m.set(v.step_id, v);
    return m;
  });
  const [storyboardVisible, setStoryboardVisible] = useState(false);

  // ---- Visual flyout state ----
  const [visualGenerating, setVisualGenerating] = useState(false);
  const [visualModification, setVisualModification] = useState("");
  const [visualError, setVisualError] = useState<string | null>(null);
  const [visualLoadingMsgIdx, setVisualLoadingMsgIdx] = useState(0);

  // ---- Interrogation state ----
  const [interrogationLoading, setInterrogationLoading] = useState(false);
  const [interrogationItems, setInterrogationItems] = useState<AISuggestionItem[]>([]);
  const [respondingItemId, setRespondingItemId] = useState<string | null>(null);
  const [respondText, setRespondText] = useState("");
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  // ---- Service moment column management ----
  const [deleteColConfirm, setDeleteColConfirm] = useState<ColumnDef | null>(null);
  const [colActionBusy, setColActionBusy] = useState(false);
  const [hoveredColId, setHoveredColId] = useState<string | null>(null);

  // ---- Drag state ----
  type DragSource = { k: CellKey; step: Step; swimlane: Swimlane };
  const [dragging, setDragging] = useState<DragSource | null>(null);
  const [dragOver, setDragOver] = useState<CellKey | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragConfirm, setDragConfirm] = useState<{ from: DragSource; toStep: Step; toSwimlane: Swimlane } | null>(null);
  const [dragMoving, setDragMoving] = useState(false);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragSourceRef = useRef<DragSource | null>(null);
  const didDragRef = useRef(false);

  // Derived: count map keyed by target_id — top-level notes only
  const noteCountMap = new Map<string, number>();
  for (const n of notes) {
    if (!n.parent_note_id) {
      noteCountMap.set(n.target_id, (noteCountMap.get(n.target_id) ?? 0) + 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Visual loading messages — cycle while generating
  // ---------------------------------------------------------------------------

  const VISUAL_LOADING_MSGS = [
    "Sharpening the pencils…",
    "Inking the outlines…",
    "Raiding the Beano archives…",
    "Applying splodge effects…",
    "Adding gratuitous custard pie…",
    "Dennis is helping…",
    "Colouring inside the lines (mostly)…",
    "Consulting the Viz art department…",
    "Applying bold black outlines…",
    "Nearly there, pet…",
    "One more panel to go…",
    "Just drying the ink…",
  ];

  useEffect(() => {
    if (!visualGenerating) { setVisualLoadingMsgIdx(0); return; }
    const interval = setInterval(() => {
      setVisualLoadingMsgIdx((i) => (i + 1) % VISUAL_LOADING_MSGS.length);
    }, 2200);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualGenerating]);

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
    if (!trimmed || trimmed === defaultTitle) {
      setTitleEditing(false);
      setTitleValue(defaultTitle);
      return;
    }
    setTitleSaving(true);
    const now = new Date().toISOString();
    await supabase.from("blueprints").update({ name: trimmed, updated_at: now }).eq("id", blueprint.id);
    setLastEdited(now);
    setTitleSaving(false);
    setTitleEditing(false);
  }

  async function saveScenarioEdit() {
    const trimmed = scenarioValue.trim();
    setScenarioEditing(false);
    if (trimmed === (blueprint.scenario ?? "")) return;
    setScenarioSaving(true);
    const now = new Date().toISOString();
    await supabase
      .from("blueprints")
      .update({ scenario: trimmed || null, updated_at: now })
      .eq("id", blueprint.id);
    setLastEdited(now);
    setScenarioSaving(false);
  }

  // ---------------------------------------------------------------------------
  // Fly-out helpers
  // ---------------------------------------------------------------------------

  function openFlyout(next: FlyoutState) {
    setFlyout(next);
    resetNoteForm();
    setCellTitleEditing(false);

    if (next?.type === "cell") {
      const k = cellKey(next.step.id, next.swimlane.id);
      const existing = cellMap.get(k);
      setFlyoutContent(existing?.content ?? "");
    }

    if (next?.type === "add-swimlane") {
      setNewSwimlane("");
    }

    if (next?.type === "add-step") {
      setNewStepTitle("");
    }

    if (next?.type === "visual") {
      setVisualModification("");
      setVisualError(null);
      // Auto-generate if no visual exists yet
      if (!visualMap.has(next.step.id)) {
        generateVisual(next.step, null);
      }
    }

    if (next?.type === "interrogation") {
      setInterrogationLoading(true);
      setInterrogationItems([]);
      setRespondingItemId(null);
      setRespondText("");

      const targetType = next.targetType;
      const targetContent =
        targetType === "cell"
          ? cellMap.get(cellKey(next.step.id, next.swimlane?.id ?? ""))?.content ?? ""
          : next.step.description ?? "";

      const nearbyContext = steps
        .filter((s) => s.id !== next.step.id)
        .slice(0, 5)
        .map((s) => ({ stepTitle: s.title }));

      const col = columns.find((c) => c.steps.some((s) => s.id === next.step.id));
      const columnContext =
        targetType === "cell" && col
          ? swimlanes.map((sl) => {
              const slStep = stepForSwimlane(col, sl, primaryUser, actorRolesMap);
              const slCell = cellMap.get(cellKey(slStep.id, sl.id));
              return {
                swimlaneName: sl.name,
                content: slCell?.content ?? null,
                isTarget: sl.id === (next.swimlane?.id ?? ""),
              };
            })
          : [];

      fetch("/api/interrogate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetContent,
          stepTitle: next.step.title,
          swimlaneName: next.swimlane?.name,
          blueprintContext: {
            title: blueprint.name,
            user_goal: blueprint.user_goal,
            primary_user: blueprint.primary_user,
            scenario: blueprint.scenario,
          },
          nearbyContext,
          columnContext,
        }),
      })
        .then((r) => r.json())
        .then(async (data: { items: { group_type: string; content: string }[] }) => {
          if (!data.items?.length) return;

          const targetId =
            targetType === "cell"
              ? (cellMap.get(cellKey(next.step.id, next.swimlane?.id ?? ""))?.id ?? next.step.id)
              : next.step.id;

          const { data: interrogation } = await supabase
            .from("ai_interrogations")
            .insert({
              blueprint_id: blueprint.id,
              target_type: targetType,
              target_id: targetId,
            })
            .select("id")
            .single();

          const iId = interrogation?.id as string | undefined;
          if (!iId) return;

          const rows = data.items.map((item) => ({
            interrogation_id: iId,
            blueprint_id: blueprint.id,
            group_type: item.group_type,
            content: item.content,
            status: "new",
          }));

          const { data: savedItems } = await supabase
            .from("ai_suggestion_items")
            .insert(rows)
            .select("*");

          if (savedItems) {
            setInterrogationItems(savedItems as AISuggestionItem[]);
          }
        })
        .catch(console.error)
        .finally(() => setInterrogationLoading(false));
    }

    // Animate in
    setTimeout(() => setFlyoutVisible(true), 10);
  }

  const closeFlyout = useCallback(() => {
    setFlyoutVisible(false);
    setTimeout(() => {
      setFlyout(null);
      setFlyoutContent("");
      setCellTitleEditing(false);
      setInterrogationItems([]);
      setRespondingItemId(null);
      setRespondText("");
      setVisualModification("");
    }, 300);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { closeFlyout(); cancelDrag(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeFlyout]);

  // Global mousemove — update ghost card position
  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) { setDragPos({ x: e.clientX, y: e.clientY }); }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [dragging]);

  // Global mouseup — finalise or cancel drag
  useEffect(() => {
    function onGlobalMouseUp() {
      // Always clear the initiation timer (handles short clicks too)
      if (dragTimerRef.current) { clearTimeout(dragTimerRef.current); dragTimerRef.current = null; }
      if (!dragging) return; // timer hadn't fired yet = short click, let onClick handle normally

      // We were in drag mode — block the upcoming onClick on any cell
      const source = dragging;
      const over = dragOver;
      setDragging(null);
      setDragOver(null);
      setDragPos(null);
      dragSourceRef.current = null;

      if (over && over !== source.k) {
        const [targetStepId, targetSwimlaneId] = over.split(":");
        const toStep = steps.find((s) => s.id === targetStepId);
        const toSwimlane = swimlanes.find((s) => s.id === targetSwimlaneId);
        if (toStep && toSwimlane) setDragConfirm({ from: source, toStep, toSwimlane });
      }

      // Reset didDragRef after click events have fired
      setTimeout(() => { didDragRef.current = false; }, 50);
    }
    window.addEventListener("mouseup", onGlobalMouseUp);
    return () => window.removeEventListener("mouseup", onGlobalMouseUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, dragOver, steps, swimlanes]);

  // ---------------------------------------------------------------------------
  // Save cell
  // ---------------------------------------------------------------------------

  async function saveCellInline() {
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
      const newKeys = new Set(aiSeededKeys);
      newKeys.delete(k);
      setAiSeededKeys(newKeys);
    }
    setFlyoutSaving(false);
    setCellTitleEditing(false);
  }

  // ---------------------------------------------------------------------------
  // Delete cell content
  // ---------------------------------------------------------------------------

  async function deleteCell() {
    if (flyout?.type !== "cell") return;
    setFlyoutSaving(true);
    const { step, swimlane } = flyout;
    const k = cellKey(step.id, swimlane.id);
    await supabase
      .from("cells")
      .upsert(
        { blueprint_id: blueprint.id, step_id: step.id, swimlane_id: swimlane.id, content: "", updated_at: new Date().toISOString() },
        { onConflict: "step_id,swimlane_id" }
      );
    const existing = cellMap.get(k);
    if (existing) {
      const newMap = new Map(cellMap);
      newMap.set(k, { ...existing, content: "" });
      setCellMap(newMap);
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
  // Add step
  // ---------------------------------------------------------------------------

  async function saveNewStep() {
    const title = newStepTitle.trim();
    if (!title) return;
    setNewStepSaving(true);

    const maxOrder = steps.reduce((max, s) => Math.max(max, s.order_index), -1);
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("blueprint_steps")
      .insert({
        blueprint_id: blueprint.id,
        title,
        order_index: maxOrder + 1,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (data) {
      setSteps((prev) => [...prev, data as Step]);
    }

    setNewStepSaving(false);
    closeFlyout();
  }

  // ---------------------------------------------------------------------------
  // Visual generation
  // ---------------------------------------------------------------------------

  async function generateVisual(step: Step, modification: string | null) {
    setVisualGenerating(true);
    setVisualError(null);
    try {
      // Build scene context from the column so the prompt is specific
      const col = columns.find((c) => c.steps.some((s) => s.id === step.id));
      const getCellContent = (swimlaneName: string): string | null => {
        if (!col) return null;
        const sl = swimlanes.find((s) => s.name.toLowerCase().includes(swimlaneName.toLowerCase()));
        if (!sl) return null;
        const slStep = stepForSwimlane(col, sl, primaryUser, actorRolesMap);
        return cellMap.get(cellKey(slStep.id, sl.id))?.content ?? null;
      };

      const res = await fetch("/api/generate-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId: step.id,
          stepTitle: step.title,
          stepDescription: step.description,
          blueprintId: blueprint.id,
          modification,
          scenario: blueprint.scenario ?? null,
          actorName: step.actor || blueprint.primary_user || null,
          userAction: getCellContent("user action"),
          frontstageAction: getCellContent("frontstage"),
        }),
      });
      const data = await res.json();
      if (data.visual) {
        setVisualMap((prev) => {
          const m = new Map(prev);
          m.set(step.id, data.visual as Visual);
          return m;
        });
        setSteps((prev) =>
          prev.map((s) => (s.id === step.id ? { ...s, visual_id: (data.visual as Visual).id } : s))
        );
      } else {
        setVisualError(data.error ?? "Generation failed — check API keys and database setup.");
      }
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : "Unexpected error during generation.");
    } finally {
      setVisualGenerating(false);
    }
  }

  async function removeVisual(step: Step) {
    const visual = visualMap.get(step.id);
    if (!visual) return;
    // Delete the file from Supabase Storage so the URL is fully gone
    const storagePath = visual.url.split("/storage/v1/object/public/visuals/")[1];
    if (storagePath) {
      await supabase.storage.from("visuals").remove([decodeURIComponent(storagePath)]);
    }
    await supabase.from("visuals").delete().eq("id", visual.id);
    await supabase.from("blueprint_steps").update({ visual_id: null }).eq("id", step.id);
    setVisualMap((prev) => { const m = new Map(prev); m.delete(step.id); return m; });
    setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, visual_id: null } : s)));
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

  async function saveReply(parentNote: Note, content: string): Promise<Note | null> {
    const { data } = await supabase
      .from("notes")
      .insert({
        blueprint_id: blueprint.id,
        target_type: parentNote.target_type,
        target_id: parentNote.target_id,
        category: parentNote.category,
        content: content.trim(),
        source_type: "user",
        parent_note_id: parentNote.id,
      })
      .select("*")
      .single();
    if (data) {
      setNotes((prev) => [...prev, data as Note]);
      return data as Note;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Interrogation actions
  // ---------------------------------------------------------------------------

  async function acceptItemAsNote(
    item: AISuggestionItem,
    targetType: "step" | "cell",
    targetId: string
  ) {
    if (!targetId || savingItemId) return;
    setSavingItemId(item.id);

    const category = GROUP_TO_NOTE_CATEGORY[item.group_type];
    const { data: note } = await supabase
      .from("notes")
      .insert({
        blueprint_id: blueprint.id,
        target_type: targetType,
        target_id: targetId,
        category,
        content: item.content,
        source_type: "ai_accept",
      })
      .select("*")
      .single();

    if (note) setNotes((prev) => [...prev, note as Note]);

    const noteId = (note as Note | null)?.id;
    await supabase
      .from("ai_suggestion_items")
      .update({ status: "accepted", saved_note_id: noteId ?? null })
      .eq("id", item.id);

    setInterrogationItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: "accepted" as const, saved_note_id: noteId ?? null } : i
      )
    );
    setSavingItemId(null);
  }

  async function acceptAllItems(targetType: "step" | "cell", targetId: string) {
    const newItems = interrogationItems.filter((i) => i.status === "new");
    for (const item of newItems) {
      await acceptItemAsNote(item, targetType, targetId);
    }
  }

  async function dismissItem(item: AISuggestionItem) {
    if (savingItemId) return;
    setSavingItemId(item.id);
    await supabase
      .from("ai_suggestion_items")
      .update({ status: "dismissed" })
      .eq("id", item.id);
    setInterrogationItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: "dismissed" as const } : i))
    );
    setSavingItemId(null);
  }

  async function saveResponse(
    item: AISuggestionItem,
    targetType: "step" | "cell",
    targetId: string,
    saveMode: "note" | "cell" | "both"
  ) {
    const text = respondText.trim();
    if (!text || savingItemId) return;
    setSavingItemId(item.id);

    let savedNoteId: string | undefined;
    let savedCellId: string | undefined;

    if (saveMode === "note" || saveMode === "both") {
      const category = GROUP_TO_NOTE_CATEGORY[item.group_type];
      // Save AI question as parent note
      const { data: parentNote } = await supabase
        .from("notes")
        .insert({
          blueprint_id: blueprint.id,
          target_type: targetType,
          target_id: targetId,
          category,
          content: item.content,
          source_type: "ai_accept",
          parent_note_id: null,
        })
        .select("*")
        .single();
      if (parentNote) {
        setNotes((prev) => [...prev, parentNote as Note]);
        savedNoteId = (parentNote as Note).id;
        // Save user's answer as a reply to the parent note
        const { data: replyNote } = await supabase
          .from("notes")
          .insert({
            blueprint_id: blueprint.id,
            target_type: targetType,
            target_id: targetId,
            category,
            content: text,
            source_type: "ai_response",
            parent_note_id: (parentNote as Note).id,
          })
          .select("*")
          .single();
        if (replyNote) {
          setNotes((prev) => [...prev, replyNote as Note]);
        }
      }
    }

    if ((saveMode === "cell" || saveMode === "both") && flyout?.type === "interrogation" && flyout.swimlane) {
      const { data: cellData } = await supabase
        .from("cells")
        .upsert(
          {
            blueprint_id: blueprint.id,
            step_id: flyout.step.id,
            swimlane_id: flyout.swimlane.id,
            content: text,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "step_id,swimlane_id" }
        )
        .select("*")
        .single();
      if (cellData) {
        const k = cellKey(flyout.step.id, flyout.swimlane.id);
        setCellMap((prev) => { const m = new Map(prev); m.set(k, cellData as Cell); return m; });
        savedCellId = (cellData as Cell).id;
      }
    }

    await supabase
      .from("ai_suggestion_items")
      .update({
        status: "responded",
        response_text: text,
        saved_note_id: savedNoteId ?? null,
        saved_cell_id: savedCellId ?? null,
      })
      .eq("id", item.id);

    setInterrogationItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, status: "responded" as const, response_text: text }
          : i
      )
    );
    setRespondingItemId(null);
    setRespondText("");
    setSavingItemId(null);
  }

  // ---------------------------------------------------------------------------
  // Service moment column move / delete
  // ---------------------------------------------------------------------------

  async function moveColumn(colId: string, direction: "left" | "right") {
    const idx = columns.findIndex((c) => c.id === colId);
    if (idx === -1) return;
    const swapIdx = direction === "left" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= columns.length) return;

    setColActionBusy(true);
    const colA = columns[idx];
    const colB = columns[swapIdx];

    // Collect all steps from both columns and reassign order_indexes
    // Give colB steps the order_indexes of colA steps (and vice versa)
    const aOrders = colA.steps.map((s) => s.order_index).sort((a, b) => a - b);
    const bOrders = colB.steps.map((s) => s.order_index).sort((a, b) => a - b);

    const doUpdate = (stepId: string, orderIndex: number) =>
      new Promise<void>((resolve) => {
        supabase.from("blueprint_steps").update({ order_index: orderIndex }).eq("id", stepId).then(() => resolve());
      });
    const updates: Promise<void>[] = [
      ...colA.steps.map((s, i) => doUpdate(s.id, bOrders[i] ?? bOrders[0])),
      ...colB.steps.map((s, i) => doUpdate(s.id, aOrders[i] ?? aOrders[0])),
    ];
    await Promise.all(updates);
    setColActionBusy(false);
    // Reload page to re-derive columns
    window.location.reload();
  }

  async function deleteColumn(col: ColumnDef) {
    setColActionBusy(true);
    const stepIds = col.steps.map((s) => s.id);
    await supabase.from("blueprint_steps").delete().in("id", stepIds);
    setDeleteColConfirm(null);
    setColActionBusy(false);
    window.location.reload();
  }

  // ---------------------------------------------------------------------------
  // Drag handlers
  // ---------------------------------------------------------------------------

  function handleCellMouseDown(e: React.MouseEvent, source: DragSource) {
    if (e.button !== 0) return;
    // Clear any stale timer from a previous mousedown that didn't fire
    if (dragTimerRef.current) { clearTimeout(dragTimerRef.current); dragTimerRef.current = null; }
    dragSourceRef.current = source;
    const { clientX, clientY } = e;
    dragTimerRef.current = setTimeout(() => {
      didDragRef.current = true;
      setDragging(source);
      setDragPos({ x: clientX, y: clientY });
    }, 420);
  }

  function cancelDrag() {
    if (dragTimerRef.current) { clearTimeout(dragTimerRef.current); dragTimerRef.current = null; }
    dragSourceRef.current = null;
    setDragging(null);
    setDragOver(null);
    setDragPos(null);
  }

  async function confirmMove() {
    if (!dragConfirm) return;
    setDragMoving(true);
    const { from, toStep, toSwimlane } = dragConfirm;
    const fromCell = cellMap.get(from.k);
    const content = fromCell?.content ?? "";
    const toKey = cellKey(toStep.id, toSwimlane.id);

    try {
      // Upsert at destination — must succeed before we touch the source
      const { data: newCell, error: destErr } = await supabase
        .from("cells")
        .upsert(
          { blueprint_id: blueprint.id, step_id: toStep.id, swimlane_id: toSwimlane.id, content, updated_at: new Date().toISOString() },
          { onConflict: "step_id,swimlane_id" }
        )
        .select("*")
        .single();

      if (destErr || !newCell) {
        console.error("confirmMove: destination upsert failed", destErr);
        return;
      }

      // Clear the source cell
      await supabase
        .from("cells")
        .upsert(
          { blueprint_id: blueprint.id, step_id: from.step.id, swimlane_id: from.swimlane.id, content: "", updated_at: new Date().toISOString() },
          { onConflict: "step_id,swimlane_id" }
        );

      // Update local map — destination gets the new cell, source is cleared
      const newMap = new Map(cellMap);
      newMap.set(toKey, newCell as Cell);
      if (fromCell) newMap.set(from.k, { ...fromCell, content: "" });
      setCellMap(newMap);

      // Migrate notes from source cell to destination cell
      if (fromCell?.id) {
        const destId = (newCell as Cell).id;
        await supabase
          .from("notes")
          .update({ target_id: destId })
          .eq("target_type", "cell")
          .eq("target_id", fromCell.id);
        setNotes((prev) =>
          prev.map((n) =>
            n.target_type === "cell" && n.target_id === fromCell.id
              ? { ...n, target_id: destId }
              : n
          )
        );
      }
    } finally {
      setDragMoving(false);
      setDragConfirm(null);
    }
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
          href={`/app/projects/${blueprint.project_id}`}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors min-w-[120px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Project overview
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
                    setTitleValue(defaultTitle);
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
                onClick={() => { setTitleEditing(false); setTitleValue(blueprint.name); }}
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
            href={`/app/projects/${blueprint.project_id}`}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            User Journey
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Scenario strip */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 px-6 py-3 bg-white border-b border-neutral-100">

        {/* Scenario label */}
        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest whitespace-nowrap">Scenario</p>

        {/* Editable scenario text */}
        <div className="flex-1 flex justify-center">
          {scenarioEditing ? (
            <div className="flex flex-col items-center gap-1.5 w-full max-w-2xl">
              <textarea
                ref={scenarioInputRef}
                value={scenarioValue}
                onChange={(e) => setScenarioValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveScenarioEdit(); } if (e.key === "Escape") { setScenarioEditing(false); setScenarioValue(blueprint.scenario ?? ""); } }}
                rows={2}
                placeholder="Describe the scenario for this blueprint…"
                className="w-full text-sm text-neutral-700 bg-white border border-primary-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-200 resize-none text-center"
              />
              <div className="flex items-center gap-2">
                <button onClick={saveScenarioEdit} disabled={scenarioSaving} className="text-xs px-3 py-1 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                  {scenarioSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                </button>
                <button onClick={() => { setScenarioEditing(false); setScenarioValue(blueprint.scenario ?? ""); }} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">Cancel</button>
              </div>
            </div>
          ) : (
            <div
              className="group/scenario flex items-center gap-2 cursor-pointer max-w-2xl"
              onClick={() => { setScenarioEditing(true); setTimeout(() => scenarioInputRef.current?.focus(), 30); }}
            >
              {scenarioValue ? (
                <p className="text-sm text-neutral-600 leading-snug">{scenarioValue}</p>
              ) : (
                <p className="text-sm text-neutral-300 italic">+ Add scenario…</p>
              )}
              <Pencil className="w-3.5 h-3.5 text-neutral-300 opacity-0 group-hover/scenario:opacity-100 flex-shrink-0 transition-opacity" />
            </div>
          )}
        </div>

        {/* Last edited */}
        <p className="text-[10px] text-neutral-400 whitespace-nowrap">
          Edited {formatRelativeTime(lastEdited)}
        </p>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Actor strip */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-shrink-0 flex items-center gap-0 px-6 py-2.5 bg-white border-b border-neutral-100">
        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest whitespace-nowrap mr-4">Actors</p>
        {(() => {
          const actors: { name: string; role: "customer" | "frontstage" | "backstage" }[] = [];
          if (primaryUser) actors.push({ name: primaryUser, role: "customer" });
          Object.entries(actorRolesMap).forEach(([name, role]) => {
            if (name !== primaryUser.toLowerCase()) actors.push({ name, role });
          });
          if (actors.length === 0) {
            return <span className="text-xs text-neutral-300">No actors yet — add them in blueprint settings</span>;
          }
          return (
            <div className="flex items-center gap-1">
              {actors.map(({ name, role }) => (
                <button
                  key={name}
                  onClick={() => openFlyout({ type: "actor", name, role })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-neutral-50 transition-colors text-neutral-800 group/actor"
                >
                  <User className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                  <span className="text-sm capitalize">{name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-300 group-hover/actor:text-neutral-500 transition-colors" />
                </button>
              ))}
            </div>
          );
        })()}
      </div>

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
        <div className="flex-1 overflow-auto">
          <div
            style={{ minWidth: `${LABEL_W + 148 + 48}px` }}
            className="pb-10"
          >
            {/* Column header row */}
            <div className="sticky top-0 z-10 flex bg-white border-b border-neutral-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div style={{ width: LABEL_W, minWidth: LABEL_W }} className="flex-shrink-0 px-4 py-3 border-r border-neutral-100" />
              <div
                style={{ width: 148, minWidth: 148 }}
                className="flex-shrink-0 flex items-center justify-center px-3 py-2.5 border-r border-neutral-100 bg-white"
              >
                <button
                  onClick={() => openFlyout({ type: "add-step" })}
                  className="inline-flex flex-col items-center gap-1.5 w-full px-3 py-3 rounded-xl border-2 border-dashed border-neutral-200 text-neutral-300 hover:border-primary-300 hover:text-primary-500 hover:bg-primary-50 transition-colors group/addstep"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide">Add step</span>
                </button>
              </div>
            </div>

            {/* Swimlane rows — labels only, no cells yet */}
            {swimlanes.map((swimlane) => (
              <div key={swimlane.id} className="flex border-b border-neutral-100">
                <div
                  style={{ width: LABEL_W, minWidth: LABEL_W, height: CELL_H }}
                  className="flex-shrink-0 flex items-start px-4 py-3 border-r border-neutral-100 bg-white sticky left-0 z-[5]"
                >
                  <span className="micro-label text-neutral-500 leading-snug pt-0.5">
                    {swimlane.name}
                  </span>
                </div>
                <div
                  style={{ width: 148, minWidth: 148, height: CELL_H }}
                  className="flex-shrink-0 border-r border-neutral-100 bg-neutral-50/30"
                />
              </div>
            ))}
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
                const showStepNotes = stepNotes.length > 0 && stepNotesExpanded.has(col.id);
                return (
                  <div
                    key={col.id}
                    style={{ width: CELL_W, minWidth: CELL_W }}
                    className={`flex-shrink-0 px-3 py-2.5 border-r border-neutral-100 cursor-pointer transition-colors group/steph ${
                      col.isServiceMoment
                        ? "bg-neutral-50 hover:bg-neutral-100"
                        : "bg-white hover:bg-neutral-50"
                    }`}
                    onMouseEnter={() => setHoveredColId(col.id)}
                    onMouseLeave={() => setHoveredColId(null)}
                    onClick={() => openFlyout({ type: "step", step: primaryStep })}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="display-num-sm text-neutral-400">{i + 1}</span>
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
                    <p className="section-label text-[11px] text-neutral-700 leading-snug line-clamp-2">
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
                        className="flex justify-center mt-1.5 transition-opacity duration-150"
                        style={{ opacity: hoveredColId === col.id ? 1 : 0 }}
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
                          className={`w-4 h-4 text-neutral-500 hover:text-neutral-800 transition-transform duration-200 ${showStepNotes ? "rotate-180" : ""}`}
                        />
                      </div>
                    )}

                    {/* Column controls — move left / delete / move right */}
                    <div
                      className="mt-1.5 pt-1.5 border-t border-neutral-200 flex items-center justify-between transition-opacity duration-150"
                      style={{ opacity: hoveredColId === col.id ? 1 : 0 }}
                    >
                      <button
                        disabled={i === 0 || colActionBusy}
                        onClick={(e) => { e.stopPropagation(); moveColumn(col.id, "left"); }}
                        className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move left"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteColConfirm(col); }}
                        className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete column"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        disabled={i === columns.length - 1 || colActionBusy}
                        onClick={(e) => { e.stopPropagation(); moveColumn(col.id, "right"); }}
                        className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move right"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

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

              {/* Add step button — end of header row */}
              <div
                style={{ width: 148, minWidth: 148 }}
                className="flex-shrink-0 flex items-center justify-center px-3 py-2.5 border-r border-neutral-100 bg-white"
              >
                <button
                  onClick={() => openFlyout({ type: "add-step" })}
                  className="inline-flex flex-col items-center gap-1.5 w-full px-3 py-3 rounded-xl border-2 border-dashed border-neutral-200 text-neutral-300 hover:border-primary-300 hover:text-primary-500 hover:bg-primary-50 transition-colors group/addstep"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide">Add step</span>
                </button>
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Storyboard row — slides in/out */}
            {/* ---------------------------------------------------------------- */}
            <div
              className={`overflow-hidden transition-all duration-400 ease-in-out ${
                storyboardVisible ? "max-h-[240px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="flex border-b-2 border-violet-100 bg-violet-50/40">
                {/* Row label */}
                <div
                  style={{ width: LABEL_W, minWidth: LABEL_W }}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-r border-violet-100 bg-violet-50 sticky left-0 z-[5]"
                >
                  <Film className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-violet-500">Storyboard</span>
                </div>
                {/* Storyboard panels — one per column */}
                {columns.map((col) => {
                  const primaryStep = col.steps.find((s) => {
                    const actor = (s.actor?.trim() || primaryUser).toLowerCase();
                    return actorRolesMap[actor] === "customer" || actor === primaryUser.toLowerCase();
                  }) ?? col.steps[0];
                  const visual = visualMap.get(primaryStep.id);
                  return (
                    <div
                      key={col.id}
                      style={{ width: CELL_W, minWidth: CELL_W, height: 180 }}
                      className="flex-shrink-0 border-r border-violet-100 p-1.5"
                    >
                      {visual ? (
                        <div
                          className="relative w-full h-full rounded-xl overflow-hidden cursor-pointer group/panel"
                          onClick={() => openFlyout({ type: "visual", step: primaryStep })}
                        >
                          <Image
                            src={visual.url}
                            alt={primaryStep.title}
                            fill
                            className="object-cover"
                            sizes={`${CELL_W}px`}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/panel:bg-black/20 transition-colors flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 text-white opacity-0 group-hover/panel:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openFlyout({ type: "visual", step: primaryStep })}
                          className="w-full h-full rounded-xl border-2 border-dashed border-violet-200 flex flex-col items-center justify-center gap-1.5 text-violet-300 hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50 transition-colors group/genpanel"
                        >
                          <Plus className="w-5 h-5" />
                          <span className="text-[9px] font-semibold uppercase tracking-wide">Generate</span>
                        </button>
                      )}
                    </div>
                  );
                })}
                {/* Spacer to match Add step cell width */}
                <div style={{ width: 148, minWidth: 148 }} className="flex-shrink-0" />
              </div>
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
                  <span className="micro-label text-neutral-500 leading-snug pt-0.5">
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
                  const evidenceHint = isEvidenceRow
                    ? (inferEvidence(cell?.content) ?? inferEvidence(step.location))
                    : null;
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
                      className={`flex-shrink-0 border-r border-neutral-100 p-1.5 cursor-pointer group/cell relative ${
                        col.isServiceMoment ? "bg-neutral-100/60" : "bg-neutral-50/40"
                      }`}
                    >
                      {/* Inner card */}
                      {(() => {
                        const isDragSource = dragging?.k === k;
                        const isDragTarget = dragging && dragging.k !== k && dragOver === k;
                        const isAnyDragging = !!dragging;
                        return (
                      <div
                        data-cell-key={k}
                        onMouseDown={(e) => handleCellMouseDown(e, { k, step, swimlane })}
                        onMouseEnter={() => { if (dragging && dragging.k !== k) setDragOver(k); }}
                        onMouseLeave={() => { if (dragOver === k) setDragOver(null); }}
                        onClick={() => { if (didDragRef.current) return; openFlyout({ type: "cell", step, swimlane }); }}
                        className={`relative rounded-xl border px-3 py-2.5 h-full transition-all duration-150 select-none ${
                          isDragSource
                            ? "bg-white/40 border-dashed border-neutral-300 opacity-40"
                            : isDragTarget
                            ? "bg-white border-primary-400 border-dashed shadow-inner scale-[0.97]"
                            : isAnyDragging
                            ? "bg-white border-dashed border-neutral-200 cursor-default"
                            : cell?.content
                            ? "bg-white border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 cursor-pointer"
                            : evidenceHint
                            ? "bg-white/70 border-neutral-100 cursor-pointer hover:bg-white hover:border-neutral-200"
                            : "bg-transparent border-transparent cursor-pointer hover:bg-white/60 hover:border-dashed hover:border-neutral-200"
                        }`}
                      >
                        {isEvidenceRow && evidenceHint && (
                          <div className="flex items-center gap-1 mb-1.5">
                            <span className="text-sm leading-none">{evidenceHint.icon}</span>
                            <span className="text-[9px] text-neutral-400 font-medium">{evidenceHint.label}</span>
                          </div>
                        )}
                        {cell?.content ? (
                          <>
                            <p className="text-[11px] text-neutral-600 leading-relaxed pr-2 pb-4">{cell.content}</p>
                            <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                              {noteCats.length > 0 && (
                                <div
                                  className="flex items-center gap-1 cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); openFlyout({ type: "cell", step, swimlane }); }}
                                >
                                  {noteCats.map(([cat, count]) => {
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
                              {isAiSeeded && (
                                <span className="opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                  <Sparkles className="w-2.5 h-2.5 text-primary-300" />
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center" style={{ minHeight: CELL_H - 24 }}>
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
                            showNoteCards ? "max-h-[9999px] opacity-100 mt-2" : "max-h-0 opacity-0"
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col gap-1.5 pb-1">
                            {cellNotes.map((note) => {
                              const cfg = NOTE_CATEGORIES[note.category];
                              const noteRef = `#${note.id.replace(/-/g, "").substring(0, 6).toUpperCase()}`;
                              return (
                                <div key={note.id} className={`rounded-lg border px-2 py-1.5 ${cfg.bgCls}`}>
                                  <div className={`flex items-center justify-between mb-0.5`}>
                                    <p className={`text-[9px] font-semibold uppercase tracking-wide ${cfg.textCls}`}>
                                      {cfg.label}
                                    </p>
                                    <span className="text-[8px] font-mono text-neutral-300">{noteRef}</span>
                                  </div>
                                  <p className={`text-[10px] leading-snug ${cfg.textCls}`}>{note.content}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                        );
                      })()}
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
      {/* Ghost drag card — follows mouse */}
      {/* ------------------------------------------------------------------ */}
      {dragging && dragPos && (
        <div
          style={{
            position: "fixed",
            left: dragPos.x - CELL_W / 2,
            top: dragPos.y - 32,
            width: CELL_W,
            zIndex: 9999,
            pointerEvents: "none",
          }}
          className="rounded-xl border border-primary-400 bg-white shadow-2xl px-3 py-2.5 rotate-2 ring-2 ring-primary-100 opacity-95"
        >
          {cellMap.get(dragging.k)?.content ? (
            <p className="text-[11px] text-neutral-600 leading-relaxed line-clamp-3">
              {cellMap.get(dragging.k)!.content}
            </p>
          ) : (
            <div className="flex items-center justify-center min-h-[40px]">
              <span className="text-[10px] text-neutral-300 italic">Empty cell</span>
            </div>
          )}
          <p className="text-[9px] text-neutral-300 mt-1.5 truncate">{dragging.swimlane.name}</p>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Delete column confirm modal */}
      {/* ------------------------------------------------------------------ */}
      {deleteColConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-neutral-900 mb-1">Delete column?</h3>
            <p className="text-sm text-neutral-600 mb-1">
              <span className="font-medium">{deleteColConfirm.title}</span>
            </p>
            <p className="text-xs text-neutral-400 mb-5">
              This will permanently delete {deleteColConfirm.steps.length} step{deleteColConfirm.steps.length !== 1 ? "s" : ""} and all their cell content. This cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { deleteColumn(deleteColConfirm); setDeleteColConfirm(null); }}
                disabled={colActionBusy}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {colActionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
              <button
                onClick={() => setDeleteColConfirm(null)}
                disabled={colActionBusy}
                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Drag confirm modal */}
      {/* ------------------------------------------------------------------ */}
      {dragConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-neutral-900 mb-1">Move cell content?</h3>
            <p className="text-sm text-neutral-500 mb-1">
              From <span className="font-medium text-neutral-700">{dragConfirm.from.swimlane.name}</span>
              {" → "}<span className="font-medium text-neutral-700">{dragConfirm.toSwimlane.name}</span>
            </p>
            <p className="text-xs text-neutral-400 mb-5">
              The source cell will be cleared. This cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={confirmMove}
                disabled={dragMoving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors"
              >
                {dragMoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Move
              </button>
              <button
                onClick={() => setDragConfirm(null)}
                disabled={dragMoving}
                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
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
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-0.5">
                    {flyout.swimlane.name}
                  </p>
                  <p className="text-[11px] text-neutral-400 mb-2">
                    Step {steps.findIndex((s) => s.id === flyout.step.id) + 1}: {flyout.step.title}
                  </p>
                  {cellTitleEditing ? (
                    <div className="flex items-start gap-2">
                      <textarea
                        autoFocus
                        value={flyoutContent}
                        onChange={(e) => setFlyoutContent(e.target.value)}
                        rows={3}
                        className="flex-1 text-sm font-semibold text-neutral-900 bg-transparent border-b-2 border-primary-400 focus:outline-none resize-none leading-snug"
                      />
                      <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                        <button
                          onClick={saveCellInline}
                          disabled={flyoutSaving}
                          className="w-6 h-6 rounded flex items-center justify-center bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                        >
                          {flyoutSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => { setCellTitleEditing(false); setFlyoutContent(cellMap.get(cellKey(flyout.step.id, flyout.swimlane.id))?.content ?? ""); }}
                          className="w-6 h-6 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 group/celltitle">
                      <h3 className="flex-1 text-base font-semibold text-neutral-900 leading-snug">
                        {flyoutContent || <span className="font-normal text-neutral-300 italic">No content yet</span>}
                      </h3>
                      <button
                        onClick={() => setCellTitleEditing(true)}
                        className="w-6 h-6 rounded flex items-center justify-center text-neutral-300 hover:text-neutral-500 hover:bg-neutral-100 opacity-0 group-hover/celltitle:opacity-100 transition-all flex-shrink-0 mt-0.5"
                        title="Edit content"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
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
              {flyout.type === "add-step" && (
                <>
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-1">Journey</p>
                  <h3 className="text-base font-semibold text-neutral-900">Add step</h3>
                </>
              )}
              {flyout.type === "actor" && (
                <>
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-1">Actor</p>
                  <h3 className="text-base font-semibold text-neutral-900 capitalize">{flyout.name}</h3>
                </>
              )}
              {flyout.type === "interrogation" && (
                <>
                  <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-1">
                    AI Interrogation — {flyout.targetType === "cell" ? flyout.swimlane?.name : "Step"}
                  </p>
                  <h3 className="text-base font-semibold text-neutral-900 leading-snug">
                    {flyout.step.title}
                  </h3>
                </>
              )}
              {flyout.type === "visual" && (
                <>
                  <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Film className="w-3 h-3" />
                    Storyboard panel
                  </p>
                  <h3 className="text-base font-semibold text-neutral-900 leading-snug">
                    {flyout.step.title}
                  </h3>
                </>
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

            {/* ---- Cell panel ---- */}
            {flyout.type === "cell" && (
              <div className="flex flex-col gap-5">
                {/* Step context chips */}
                {(flyout.step.actor || flyout.step.location) && (
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
                )}

                {/* Service moment cross-section */}
                {(() => {
                  const col = columns.find((c) => c.steps.some((s) => s.id === flyout.step.id));
                  if (!col) return null;
                  const otherSwimlanes = swimlanes.filter((sl) => sl.id !== flyout.swimlane.id);
                  if (!otherSwimlanes.length) return null;
                  return (
                    <div>
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">
                        Rest of this service moment
                      </p>
                      <div className="rounded-xl border border-neutral-100 overflow-hidden">
                        {otherSwimlanes.map((sl) => {
                          const slStep = stepForSwimlane(col, sl, primaryUser, actorRolesMap);
                          const slCell = cellMap.get(cellKey(slStep.id, sl.id));
                          const hasContent = !!slCell?.content;
                          return (
                            <div
                              key={sl.id}
                              className="px-3 py-2.5 border-b border-neutral-100 last:border-b-0 bg-white"
                            >
                              <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">
                                {sl.name}
                              </p>
                              {hasContent ? (
                                <p className="text-[11px] text-neutral-600 leading-relaxed">
                                  {slCell!.content}
                                </p>
                              ) : (
                                <p className="text-[11px] text-neutral-300 italic flex items-center gap-1">
                                  <span className="text-neutral-200 font-semibold">?</span>
                                  Not yet captured
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

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
                      onReply={saveReply}
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
                    href={`/app/projects/${blueprint.project_id}`}
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
                  onReply={saveReply}
                />
              </div>
            )}

            {/* ---- Actor detail ---- */}
            {flyout.type === "actor" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                  <User className="w-8 h-8 text-neutral-300" />
                  <div>
                    <p className="text-sm font-medium text-neutral-700 capitalize">{flyout.name}</p>
                    <p className="text-xs text-neutral-400">{ROLE_STYLE[flyout.role].label}</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Detailed actor profiles — goals, pain points, demographics, and more — will be available in a future update.
                </p>
              </div>
            )}

            {/* ---- Interrogation panel ---- */}
            {flyout.type === "interrogation" && (() => {
              const targetType = flyout.targetType;
              const targetId =
                targetType === "cell"
                  ? (cellMap.get(cellKey(flyout.step.id, flyout.swimlane?.id ?? ""))?.id ?? flyout.step.id)
                  : flyout.step.id;
              const newItems = interrogationItems.filter((i) => i.status === "new");

              return (
                <div className="flex flex-col gap-5">
                  {interrogationLoading && (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                      <p className="text-sm text-neutral-400">Analysing this moment…</p>
                    </div>
                  )}

                  {!interrogationLoading && interrogationItems.length === 0 && (
                    <p className="text-sm text-neutral-400 py-6 text-center">No suggestions generated.</p>
                  )}

                  {!interrogationLoading && interrogationItems.length > 0 && (
                    <>
                      {/* Accept all */}
                      {newItems.length > 1 && (
                        <button
                          onClick={() => acceptAllItems(targetType, targetId)}
                          disabled={!!savingItemId}
                          className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          Accept all as notes ({newItems.length})
                        </button>
                      )}

                      {/* Groups */}
                      {(Object.keys(INTERROGATION_GROUPS) as InterrogationGroupType[]).map((group) => {
                        const groupItems = interrogationItems.filter((i) => i.group_type === group);
                        if (!groupItems.length) return null;
                        const cfg = INTERROGATION_GROUPS[group];
                        const Icon = cfg.icon;
                        return (
                          <div key={group} className="flex flex-col gap-2">
                            <div className={`flex items-center gap-1.5 ${cfg.textCls}`}>
                              <Icon className="w-3.5 h-3.5" />
                              <span className="text-xs font-semibold uppercase tracking-wide">
                                {cfg.label}
                              </span>
                            </div>
                            {groupItems.map((item) => {
                              const isResponding = respondingItemId === item.id;
                              const isSaving = savingItemId === item.id;
                              return (
                                <div
                                  key={item.id}
                                  className={`rounded-xl border p-3 ${cfg.bgCls} ${cfg.borderCls} ${
                                    item.status === "dismissed" ? "opacity-40" : ""
                                  }`}
                                >
                                  <p className={`text-xs leading-relaxed mb-2 ${cfg.textCls}`}>
                                    {item.content}
                                  </p>

                                  {/* Status badge */}
                                  {item.status !== "new" && !isResponding && (
                                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1 ${
                                      item.status === "accepted"  ? "bg-green-100 text-green-700" :
                                      item.status === "responded" ? "bg-blue-100 text-blue-700" :
                                      "bg-neutral-100 text-neutral-400"
                                    }`}>
                                      {item.status === "accepted" ? "Saved as note" : item.status === "responded" ? "Answered" : "Dismissed"}
                                    </span>
                                  )}

                                  {/* Response input */}
                                  {isResponding && (
                                    <div className="flex flex-col gap-2 mt-1">
                                      <textarea
                                        autoFocus
                                        value={respondText}
                                        onChange={(e) => setRespondText(e.target.value)}
                                        rows={3}
                                        placeholder="Your answer…"
                                        className="w-full px-2.5 py-2 rounded-lg border border-neutral-200 text-xs text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100 resize-none bg-white transition-colors"
                                      />
                                      <div className="flex flex-wrap gap-1.5">
                                        <button
                                          onClick={() => saveResponse(item, targetType, targetId, "note")}
                                          disabled={isSaving || !respondText.trim()}
                                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-neutral-800 text-white hover:bg-neutral-900 disabled:opacity-50 transition-colors"
                                        >
                                          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                          Save as note
                                        </button>
                                        {targetType === "cell" && (
                                          <>
                                            <button
                                              onClick={() => saveResponse(item, targetType, targetId, "cell")}
                                              disabled={isSaving || !respondText.trim()}
                                              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                                            >
                                              Save to cell
                                            </button>
                                            <button
                                              onClick={() => saveResponse(item, targetType, targetId, "both")}
                                              disabled={isSaving || !respondText.trim()}
                                              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                                            >
                                              Note + cell
                                            </button>
                                          </>
                                        )}
                                        <button
                                          onClick={() => { setRespondingItemId(null); setRespondText(""); }}
                                          className="text-[11px] text-neutral-400 hover:text-neutral-600 transition-colors px-1"
                                        >
                                          Discard
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Item actions — only for new items */}
                                  {item.status === "new" && !isResponding && (
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                      <button
                                        onClick={() => acceptItemAsNote(item, targetType, targetId)}
                                        disabled={!!savingItemId}
                                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-neutral-600 hover:border-green-300 hover:text-green-700 hover:bg-green-50 disabled:opacity-50 transition-colors"
                                      >
                                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => { setRespondingItemId(item.id); setRespondText(""); }}
                                        disabled={!!savingItemId}
                                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-neutral-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                        Answer
                                      </button>
                                      <button
                                        onClick={() => dismissItem(item)}
                                        disabled={!!savingItemId}
                                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-neutral-300 hover:text-neutral-500 disabled:opacity-50 transition-colors"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })()}

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

            {/* ---- Add step panel ---- */}
            {flyout.type === "add-step" && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-2">
                    Step title
                  </label>
                  <input
                    autoFocus
                    value={newStepTitle}
                    onChange={(e) => setNewStepTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveNewStep(); }}
                    placeholder="e.g. Customer submits application…"
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 transition-colors"
                  />
                </div>
                <p className="text-xs text-neutral-400">
                  The new step will be appended at the end of the journey.
                </p>
              </div>
            )}

            {/* ---- Visual panel ---- */}
            {flyout.type === "visual" && (() => {
              const visual = visualMap.get(flyout.step.id);
              return (
                <div className="flex flex-col gap-4">
                  {/* Image area */}
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
                    {visualGenerating ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
                        {/* Comic panel border effect */}
                        <div className="w-full border-4 border-dashed border-violet-200 rounded-xl py-6 px-4 flex flex-col items-center gap-3 bg-white/60">
                          <div className="flex items-center gap-1.5">
                            {[0,1,2].map((i) => (
                              <div
                                key={i}
                                className="w-2.5 h-2.5 rounded-full bg-violet-400"
                                style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                              />
                            ))}
                          </div>
                          <p
                            key={visualLoadingMsgIdx}
                            className="text-sm font-semibold text-violet-600 text-center leading-snug"
                            style={{ animation: "fadeIn 0.4s ease-in" }}
                          >
                            {VISUAL_LOADING_MSGS[visualLoadingMsgIdx]}
                          </p>
                          <p className="text-[10px] text-neutral-400 uppercase tracking-widest">Beano / Viz style</p>
                        </div>
                      </div>
                    ) : visual ? (
                      <Image
                        src={visual.url}
                        alt={flyout.step.title}
                        fill
                        className="object-cover"
                        sizes="372px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-300">
                        <Film className="w-8 h-8" />
                        <p className="text-xs">No panel yet</p>
                      </div>
                    )}
                  </div>

                  {/* Error message */}
                  {visualError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                      <p className="text-xs font-semibold text-red-600 mb-0.5">Generation failed</p>
                      <p className="text-[11px] text-red-500 leading-relaxed">{visualError}</p>
                    </div>
                  )}

                  {/* Modification input */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                      {visual ? "Refine the panel" : "Optional: add a direction"}
                    </label>
                    <textarea
                      value={visualModification}
                      onChange={(e) => setVisualModification(e.target.value)}
                      rows={2}
                      placeholder={visual ? "e.g. make it more chaotic, add a queue…" : "e.g. show panic, busy office, sunny day…"}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 resize-none transition-colors"
                    />
                  </div>

                  {/* Regen button */}
                  <button
                    onClick={() => generateVisual(flyout.step, visualModification || null)}
                    disabled={visualGenerating}
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {visualGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {visual ? "Regenerate panel" : "Generate panel"}
                  </button>
                </div>
              );
            })()}

          </div>

          {/* Fly-out footer */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-neutral-100 flex items-center gap-3">
            {flyout.type === "cell" && (
              <>
                <button
                  onClick={() => openFlyout({ type: "interrogation", targetType: "cell", step: flyout.step, swimlane: flyout.swimlane })}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Interrogate
                </button>
                <button
                  onClick={closeFlyout}
                  className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  Close
                </button>
                {cellMap.get(cellKey(flyout.step.id, flyout.swimlane.id))?.content && (
                  <button
                    onClick={deleteCell}
                    disabled={flyoutSaving}
                    className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}
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
            {flyout.type === "add-step" && (
              <>
                <button
                  onClick={saveNewStep}
                  disabled={newStepSaving || !newStepTitle.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {newStepSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add step
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
              <>
                <button
                  onClick={() => openFlyout({ type: "interrogation", targetType: "step", step: flyout.step })}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Interrogate
                </button>
                <button
                  onClick={closeFlyout}
                  className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  Close
                </button>
              </>
            )}
            {flyout.type === "actor" && (
              <button
                onClick={closeFlyout}
                className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                Close
              </button>
            )}
            {flyout.type === "interrogation" && (
              <button
                onClick={closeFlyout}
                className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                Close
              </button>
            )}
            {flyout.type === "visual" && (() => {
              const visual = visualMap.get(flyout.step.id);
              return (
                <>
                  <button
                    onClick={closeFlyout}
                    className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    {visual ? "Close" : "Discard"}
                  </button>
                  {visual && (
                    <button
                      onClick={async () => { await removeVisual(flyout.step); closeFlyout(); }}
                      disabled={visualGenerating}
                      className="ml-auto text-sm text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                    >
                      Remove panel
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
