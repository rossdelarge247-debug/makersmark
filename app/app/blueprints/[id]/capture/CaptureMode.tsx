"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
  X,
  Pencil,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Blueprint, Step } from "@/lib/types/blueprint";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CapturePhase = "description" | "title";
type PageMode = "idle" | "capturing" | "editing";

interface CaptureState {
  description: string;
  suggestedTitle: string;
  title: string;
  isSuggestingTitle: boolean;
  editingStepId: string | null; // null = new step
  insertAfterIndex: number | null; // null = append
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNextOrderIndex(steps: Step[], insertAfterIndex: number | null): number {
  if (steps.length === 0) return 0;
  if (insertAfterIndex === null) return steps.length;
  return insertAfterIndex + 1;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CaptureModeProps {
  blueprint: Blueprint;
  initialSteps: Step[];
}

export default function CaptureMode({ blueprint, initialSteps }: CaptureModeProps) {
  const router = useRouter();
  const supabase = createClient();

  // ---- State ----
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [mode, setMode] = useState<PageMode>(initialSteps.length === 0 ? "idle" : "idle");
  const [phase, setPhase] = useState<CapturePhase>("description");
  const [capture, setCapture] = useState<CaptureState>({
    description: "",
    suggestedTitle: "",
    title: "",
    isSuggestingTitle: false,
    editingStepId: null,
    insertAfterIndex: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Transition visibility
  const [phaseVisible, setPhaseVisible] = useState(true);

  // Pending navigation after save
  const pendingNav = useRef<"loop" | "overview" | null>(null);

  const descTextareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ---- Focus management ----
  useEffect(() => {
    if (mode === "capturing" || mode === "editing") {
      if (phase === "description") {
        setTimeout(() => descTextareaRef.current?.focus(), 50);
      } else {
        setTimeout(() => titleInputRef.current?.focus(), 50);
      }
    }
  }, [mode, phase]);

  // ---- Transition helper ----
  function transitionPhase(nextPhase: CapturePhase, fn?: () => void) {
    setPhaseVisible(false);
    setTimeout(() => {
      fn?.();
      setPhase(nextPhase);
      setPhaseVisible(true);
    }, 200);
  }

  // ---- Start capturing a new step ----
  function startCapture(insertAfterIndex: number | null = null) {
    pendingNav.current = null;
    setCapture({
      description: "",
      suggestedTitle: "",
      title: "",
      isSuggestingTitle: false,
      editingStepId: null,
      insertAfterIndex,
    });
    setPhase("description");
    setPhaseVisible(true);
    setMode("capturing");
  }

  // ---- Start editing an existing step ----
  function startEdit(step: Step) {
    pendingNav.current = null;
    setCapture({
      description: step.description ?? "",
      suggestedTitle: "",
      title: step.title,
      isSuggestingTitle: false,
      editingStepId: step.id,
      insertAfterIndex: null,
    });
    setPhase("description");
    setPhaseVisible(true);
    setMode("editing");
  }

  // ---- Cancel / return to idle ----
  function cancelCapture() {
    setPhaseVisible(false);
    setTimeout(() => {
      setMode("idle");
      setPhaseVisible(true);
    }, 200);
  }

  // ---- Description → Title ----
  async function handleDescriptionNext(goToOverview = false) {
    if (!capture.description.trim()) return;
    if (goToOverview) pendingNav.current = "overview";

    // Transition to title phase while fetching suggestion
    transitionPhase("title", () => {
      setCapture((prev) => ({ ...prev, isSuggestingTitle: true, suggestedTitle: "", title: "" }));
    });

    try {
      const res = await fetch("/api/suggest-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: capture.description }),
      });
      const data = await res.json();
      const suggested = data.title ?? "";
      setCapture((prev) => ({
        ...prev,
        suggestedTitle: suggested,
        title: suggested,
        isSuggestingTitle: false,
      }));
      setTimeout(() => titleInputRef.current?.focus(), 50);
    } catch {
      setCapture((prev) => ({
        ...prev,
        isSuggestingTitle: false,
        title: prev.description.split(" ").slice(0, 5).join(" "),
      }));
    }
  }

  // ---- Confirm step (add or update) ----
  async function handleConfirm(goToOverview = false) {
    if (!capture.title.trim()) return;
    if (goToOverview) pendingNav.current = "overview";

    setIsSaving(true);

    try {
      if (capture.editingStepId) {
        // Update existing step
        const { error } = await supabase
          .from("steps")
          .update({
            title: capture.title.trim(),
            description: capture.description.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", capture.editingStepId);

        if (error) throw error;

        setSteps((prev) =>
          prev.map((s) =>
            s.id === capture.editingStepId
              ? { ...s, title: capture.title.trim(), description: capture.description.trim() || null }
              : s
          )
        );
      } else {
        // Insert new step — compute order_index and shift others if inserting mid-list
        const insertAfter = capture.insertAfterIndex;
        const newOrderIndex = getNextOrderIndex(steps, insertAfter);

        // Shift existing steps if inserting mid-list
        let updatedSteps = [...steps];
        if (insertAfter !== null && insertAfter < steps.length - 1) {
          const toShift = updatedSteps.slice(insertAfter + 1);
          const shiftUpdates = toShift.map((s, i) =>
            supabase
              .from("steps")
              .update({ order_index: newOrderIndex + 1 + i })
              .eq("id", s.id)
          );
          await Promise.all(shiftUpdates);
          updatedSteps = updatedSteps.map((s, idx) => {
            if (idx > insertAfter) {
              return { ...s, order_index: newOrderIndex + 1 + (idx - insertAfter - 1) };
            }
            return s;
          });
        }

        const { data, error } = await supabase
          .from("steps")
          .insert({
            blueprint_id: blueprint.id,
            title: capture.title.trim(),
            description: capture.description.trim() || null,
            order_index: newOrderIndex,
          })
          .select("*")
          .single();

        if (error || !data) throw error ?? new Error("Failed to save step");

        const newStep = data as Step;
        if (insertAfter === null || insertAfter >= updatedSteps.length - 1) {
          setSteps([...updatedSteps, newStep]);
        } else {
          const inserted = [
            ...updatedSteps.slice(0, insertAfter + 1),
            newStep,
            ...updatedSteps.slice(insertAfter + 1),
          ];
          setSteps(inserted);
        }
      }

      // Navigate or loop
      if (pendingNav.current === "overview") {
        router.push(`/app/blueprints/${blueprint.id}/overview`);
        return;
      }

      // Loop: fade out then reset to description
      setPhaseVisible(false);
      setTimeout(() => {
        setCapture({
          description: "",
          suggestedTitle: "",
          title: "",
          isSuggestingTitle: false,
          editingStepId: null,
          insertAfterIndex: null,
        });
        setPhase("description");
        setPhaseVisible(true);
      }, 200);
    } catch (err) {
      console.error("Failed to save step:", err);
    } finally {
      setIsSaving(false);
    }
  }

  // ---- Reorder ----
  async function moveStep(stepId: string, direction: "up" | "down") {
    const idx = steps.findIndex((s) => s.id === stepId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === steps.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newSteps = [...steps];
    [newSteps[idx], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[idx]];

    const reordered = newSteps.map((s, i) => ({ ...s, order_index: i }));
    setSteps(reordered);

    const updates = reordered.map((s) =>
      supabase.from("steps").update({ order_index: s.order_index }).eq("id", s.id)
    );
    await Promise.all(updates);
  }

  // ---- Delete ----
  async function deleteStep(stepId: string) {
    const { error } = await supabase.from("steps").delete().eq("id", stepId);
    if (error) {
      console.error("Failed to delete step:", error);
      return;
    }
    setSteps((prev) => {
      const remaining = prev.filter((s) => s.id !== stepId);
      return remaining.map((s, i) => ({ ...s, order_index: i }));
    });
    setDeleteConfirmId(null);
    // If editing this step, cancel
    if (capture.editingStepId === stepId) {
      cancelCapture();
    }
  }

  // ---- Key handlers ----
  function handleDescriptionKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleDescriptionNext();
    }
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  }

  // ---- Derived ----
  const isEmptyState = steps.length === 0 && mode === "idle";
  const isCapturing = mode === "capturing" || mode === "editing";
  const charCount = capture.description.length;

  // ---- Render ----
  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] -mx-8 -my-8">
      {/* ------------------------------------------------------------------ */}
      {/* Main capture area */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top nav */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-neutral-100 bg-white">
          <Link
            href={`/app/blueprints/${blueprint.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to blueprint
          </Link>
          <Link
            href={`/app/blueprints/${blueprint.id}/overview`}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            View overview
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Blueprint context */}
        <div className="px-8 pt-8 pb-2">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest">
            {blueprint.title}
          </p>
        </div>

        {/* ---- Empty state ---- */}
        {isEmptyState && (
          <div className="flex-1 flex items-center justify-center px-8">
            <div className="max-w-lg w-full text-center">
              <div className="mb-6">
                <div className="inline-flex w-14 h-14 rounded-2xl bg-primary-50 items-center justify-center mb-5">
                  <Plus className="w-6 h-6 text-primary-500" />
                </div>
                <h1 className="text-3xl font-bold text-neutral-900 mb-3 leading-tight">
                  Ready to map the journey?
                </h1>
                <p className="text-base text-neutral-500 leading-relaxed">
                  Capture each step of the service experience, one moment at a time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => startCapture()}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm"
              >
                Capture first step
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ---- Idle state with steps ---- */}
        {mode === "idle" && steps.length > 0 && (
          <div className="flex-1 flex items-center justify-center px-8">
            <div className="max-w-lg w-full text-center">
              <h1 className="text-2xl font-bold text-neutral-900 mb-3">
                {steps.length} step{steps.length !== 1 ? "s" : ""} captured
              </h1>
              <p className="text-sm text-neutral-500 mb-8">
                Add another step or edit existing ones from the panel.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => startCapture()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add next step
                </button>
                <Link
                  href={`/app/blueprints/${blueprint.id}/overview`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
                >
                  View blueprint
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ---- Capture / Edit flow ---- */}
        {isCapturing && (
          <div className="flex-1 flex items-center justify-center px-8 py-12">
            <div className="max-w-2xl w-full">
              {/* Phase indicator */}
              <div className="flex items-center gap-3 mb-10">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                      phase === "description" ? "bg-primary-500" : "bg-neutral-300"
                    }`}
                  />
                  <div
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                      phase === "title" ? "bg-primary-500" : "bg-neutral-300"
                    }`}
                  />
                </div>
                <span className="text-xs text-neutral-400">
                  {mode === "editing"
                    ? "Editing step"
                    : capture.insertAfterIndex === -1
                    ? "New step — inserting at start"
                    : capture.insertAfterIndex !== null
                    ? `New step — inserting after step ${capture.insertAfterIndex + 1}`
                    : "New step"}
                </span>
                <button
                  type="button"
                  onClick={cancelCapture}
                  className="ml-auto text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Phase: Description */}
              <div
                className={`transition-all duration-200 ${
                  phaseVisible && phase === "description"
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2 pointer-events-none absolute"
                }`}
              >
                {phase === "description" && (
                  <>
                    <h2 className="text-3xl font-bold text-neutral-900 mb-8 leading-tight">
                      Describe this step in the journey.
                    </h2>

                    <div className="relative">
                      <textarea
                        ref={descTextareaRef}
                        value={capture.description}
                        onChange={(e) =>
                          setCapture((prev) => ({ ...prev, description: e.target.value }))
                        }
                        onKeyDown={handleDescriptionKeyDown}
                        placeholder="What happens at this moment? What does the user do, see, or experience?"
                        rows={6}
                        className="w-full resize-none bg-transparent text-lg text-neutral-800 placeholder:text-neutral-300 focus:outline-none leading-relaxed border-b-2 border-neutral-200 focus:border-primary-400 transition-colors duration-200 pb-3"
                      />
                      {/* Character guidance */}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-neutral-400">
                          ⌘ + Enter to continue
                        </p>
                        <p
                          className={`text-xs transition-colors ${
                            charCount > 200 ? "text-amber-500" : "text-neutral-300"
                          }`}
                        >
                          {charCount > 150 ? `${charCount} chars` : ""}
                          {charCount > 200 ? " — consider being more concise" : ""}
                        </p>
                      </div>
                    </div>

                    <div className="mt-10 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleDescriptionNext()}
                        disabled={!capture.description.trim()}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDescriptionNext(true)}
                        disabled={!capture.description.trim()}
                        className="text-sm text-neutral-400 hover:text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Done — view blueprint
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Phase: Title */}
              <div
                className={`transition-all duration-200 ${
                  phaseVisible && phase === "title"
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2 pointer-events-none absolute"
                }`}
              >
                {phase === "title" && (
                  <>
                    {/* Description context */}
                    {capture.description && (
                      <p className="text-sm text-neutral-400 leading-relaxed mb-8 max-w-xl line-clamp-3">
                        {capture.description}
                      </p>
                    )}

                    <h2 className="text-3xl font-bold text-neutral-900 mb-8 leading-tight">
                      Give this step a short title.
                    </h2>

                    <div className="relative">
                      {capture.isSuggestingTitle ? (
                        <div className="flex items-center gap-3 border-b-2 border-neutral-200 pb-3">
                          <span className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin flex-shrink-0" />
                          <span className="text-lg text-neutral-400">Suggesting title…</span>
                        </div>
                      ) : (
                        <input
                          ref={titleInputRef}
                          type="text"
                          value={capture.title}
                          onChange={(e) =>
                            setCapture((prev) => ({ ...prev, title: e.target.value }))
                          }
                          onKeyDown={handleTitleKeyDown}
                          placeholder="e.g. User submits application form"
                          className="w-full bg-transparent text-xl text-neutral-800 placeholder:text-neutral-300 focus:outline-none border-b-2 border-neutral-200 focus:border-primary-400 transition-colors duration-200 pb-3"
                        />
                      )}
                      {capture.suggestedTitle && !capture.isSuggestingTitle && (
                        <p className="mt-1.5 text-xs text-neutral-400">
                          AI suggested — edit freely
                        </p>
                      )}
                    </div>

                    <div className="mt-10 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleConfirm()}
                        disabled={!capture.title.trim() || isSaving || capture.isSuggestingTitle}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSaving ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Saving…
                          </>
                        ) : mode === "editing" ? (
                          <>
                            Update step
                            <Check className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            Add step
                            <Check className="w-4 h-4" />
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirm(true)}
                        disabled={!capture.title.trim() || isSaving || capture.isSuggestingTitle}
                        className="text-sm text-neutral-400 hover:text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {mode === "editing" ? "Update — view blueprint" : "Add — view blueprint"}
                      </button>
                      <button
                        type="button"
                        onClick={() => transitionPhase("description")}
                        className="ml-auto text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        ← Edit description
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Step list sidebar */}
      {/* ------------------------------------------------------------------ */}
      {steps.length > 0 && (
        <aside className="w-72 flex-shrink-0 border-l border-neutral-200 bg-white flex flex-col">
          <div className="px-5 py-5 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                Journey steps
              </h3>
              <span className="text-xs text-neutral-400">{steps.length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {steps.map((step, idx) => {
              const isActive =
                (mode === "editing" && capture.editingStepId === step.id) ||
                (mode === "capturing" && capture.insertAfterIndex === idx);
              const isDeleting = deleteConfirmId === step.id;

              return (
                <div key={step.id} className="group relative">
                  {/* Insert before first step */}
                  {idx === 0 && (
                    <button
                      type="button"
                      onClick={() => startCapture(-1)}
                      className="w-full flex items-center gap-2 px-5 py-1 text-xs text-neutral-300 hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-all duration-150"
                    >
                      <span className="flex-1 h-px bg-current" />
                      <Plus className="w-3 h-3" />
                      <span className="flex-1 h-px bg-current" />
                    </button>
                  )}

                  {/* Step row */}
                  <div
                    className={`mx-2 rounded-lg px-3 py-3 transition-colors duration-150 ${
                      isActive
                        ? "bg-primary-50 border border-primary-200"
                        : "hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Step number */}
                      <span
                        className={`flex-shrink-0 w-5 h-5 rounded-full text-xs font-semibold flex items-center justify-center mt-0.5 ${
                          isActive
                            ? "bg-primary-600 text-white"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {idx + 1}
                      </span>

                      {/* Title — click to edit */}
                      <button
                        type="button"
                        onClick={() => startEdit(step)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p
                          className={`text-sm font-medium leading-snug truncate ${
                            isActive ? "text-primary-700" : "text-neutral-700"
                          }`}
                        >
                          {step.title}
                        </p>
                        {step.description && (
                          <p className="mt-0.5 text-xs text-neutral-400 line-clamp-1">
                            {step.description}
                          </p>
                        )}
                      </button>

                      {/* Actions */}
                      {!isDeleting && (
                        <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            type="button"
                            onClick={() => startEdit(step)}
                            title="Edit step"
                            className="p-1 rounded text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(step.id, "up")}
                            disabled={idx === 0}
                            title="Move up"
                            className="p-1 rounded text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(step.id, "down")}
                            disabled={idx === steps.length - 1}
                            title="Move down"
                            className="p-1 rounded text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(step.id)}
                            title="Delete step"
                            className="p-1 rounded text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Delete confirm */}
                      {isDeleting && (
                        <div className="flex-shrink-0 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => deleteStep(step.id)}
                            title="Confirm delete"
                            className="p-1 rounded text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            title="Cancel"
                            className="p-1 rounded text-neutral-400 hover:bg-neutral-100 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Insert after this step */}
                  <button
                    type="button"
                    onClick={() => startCapture(idx)}
                    className="w-full flex items-center gap-2 px-5 py-1 text-xs text-neutral-300 hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-all duration-150"
                  >
                    <span className="flex-1 h-px bg-current" />
                    <Plus className="w-3 h-3" />
                    <span className="flex-1 h-px bg-current" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add step button */}
          <div className="px-4 py-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => startCapture()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-neutral-300 text-sm text-neutral-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all duration-150"
            >
              <Plus className="w-4 h-4" />
              Add step
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
