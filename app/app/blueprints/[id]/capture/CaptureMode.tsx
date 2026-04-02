"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Plus, MapPin, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Blueprint, Step } from "@/lib/types/blueprint";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CapturePhase = "actor" | "location" | "description" | "title";

interface CaptureState {
  actor: string;
  location: string;
  description: string;
  suggestedTitle: string;
  title: string;
  isSuggestingTitle: boolean;
  editingStepId: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUniqueActors(steps: Step[], primaryUser: string | null): string[] {
  const seen = new Set<string>();
  const actors: string[] = [];

  // Primary user always first
  const primary = primaryUser?.trim() || "";
  if (primary) {
    seen.add(primary.toLowerCase());
    actors.push(primary);
  }

  // Add actors from existing steps (in order of appearance)
  for (const step of steps) {
    if (step.actor) {
      const key = step.actor.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        actors.push(step.actor.trim());
      }
    }
  }

  return actors;
}

function groupStepsByActor(steps: Step[], primaryUser: string | null): { actor: string; steps: (Step | null)[] }[] {
  const primary = primaryUser?.trim() || "Primary user";
  const actorOrder: string[] = [];
  const actorSet = new Set<string>();

  // Primary user always first
  actorOrder.push(primary);
  actorSet.add(primary.toLowerCase());

  // Collect all actors in order of first appearance
  for (const step of steps) {
    const actor = step.actor?.trim() || primary;
    const key = actor.toLowerCase();
    if (!actorSet.has(key)) {
      actorSet.add(key);
      actorOrder.push(actor);
    }
  }

  const totalColumns = steps.length;

  return actorOrder.map((actor) => ({
    actor,
    // For each global column position, place the step if it belongs to this actor, else null
    steps: Array.from({ length: totalColumns }, (_, colIndex) => {
      const step = steps[colIndex];
      if (!step) return null;
      const stepActor = step.actor?.trim() || primary;
      return stepActor.toLowerCase() === actor.toLowerCase() ? step : null;
    }),
  }));
}

// ---------------------------------------------------------------------------
// Storyboard Strip
// ---------------------------------------------------------------------------

interface StoryboardStripProps {
  steps: Step[];
  blueprint: Blueprint;
  editingStepId: string | null;
  onSelectStep: (step: Step) => void;
  onAddStepForActor: (actor: string) => void;
}

function StoryboardStrip({
  steps,
  blueprint,
  editingStepId,
  onSelectStep,
  onAddStepForActor,
}: StoryboardStripProps) {
  const primary = blueprint.primary_user?.trim() || "Primary user";
  const rows = groupStepsByActor(steps, primary);

  const CARD_W = 160; // fixed column width in px

  return (
    <div className="w-full bg-white border-b border-neutral-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {steps.length === 0 ? (
        <div className="px-8 py-5 flex items-center gap-2 text-xs text-neutral-300">
          <div className="w-5 h-5 rounded border border-dashed border-neutral-200 flex items-center justify-center">
            <Plus className="w-3 h-3" />
          </div>
          Steps will appear here as you capture them
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-none">
          <div className="divide-y divide-neutral-100" style={{ minWidth: `${(steps.length + 1) * (CARD_W + 8) + 120}px` }}>
            {rows.map(({ actor, steps: gridCells }) => (
              <div key={actor} className="flex items-start px-6 py-3 gap-3">
                {/* Actor label */}
                <div className="flex-shrink-0 w-28 pt-2">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-neutral-300 flex-shrink-0" />
                    <span className="text-xs text-neutral-400 font-medium leading-snug" title={actor}>
                      {actor}
                    </span>
                  </div>
                </div>

                {/* Grid cells — one per global step position */}
                <div className="flex items-center gap-2">
                  {gridCells.map((step, colIndex) => {
                    const globalNum = colIndex + 1;

                    if (!step) {
                      // Empty placeholder box
                      return (
                        <div
                          key={`empty-${colIndex}`}
                          style={{ width: CARD_W }}
                          className="flex-shrink-0 h-[80px] rounded-lg border border-dashed border-neutral-150 bg-neutral-50/50"
                        />
                      );
                    }

                    const isActive = step.id === editingStepId;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => onSelectStep(step)}
                        style={{ width: CARD_W }}
                        className={`flex-shrink-0 h-[80px] flex flex-col justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-150 shadow-sm ${
                          isActive
                            ? "bg-primary-50 border border-primary-400"
                            : "bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[10px] font-semibold ${isActive ? "text-primary-500" : "text-neutral-400"}`}>
                            {globalNum}
                          </span>
                          {step.location && (
                            <span className="flex items-center gap-0.5 text-[9px] text-neutral-300 truncate max-w-[90px]">
                              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate">{step.location}</span>
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] font-medium leading-snug ${isActive ? "text-primary-700" : "text-neutral-700"}`}>
                          {step.title}
                        </p>
                      </button>
                    );
                  })}

                  {/* Add step for this actor */}
                  <button
                    type="button"
                    onClick={() => onAddStepForActor(actor)}
                    style={{ width: CARD_W }}
                    className="flex-shrink-0 h-[80px] rounded-lg border border-dashed border-neutral-200 flex items-center justify-center text-neutral-300 hover:border-primary-300 hover:text-primary-500 hover:bg-primary-50 transition-all duration-150"
                    title={`Add step for ${actor}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
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
  const [phase, setPhase] = useState<CapturePhase>("actor");
  const [isCapturing, setIsCapturing] = useState(false);
  const [phaseVisible, setPhaseVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [addActorInput, setAddActorInput] = useState("");
  const [showAddActor, setShowAddActor] = useState(false);

  const [capture, setCapture] = useState<CaptureState>({
    actor: blueprint.primary_user?.trim() || "",
    location: "",
    description: "",
    suggestedTitle: "",
    title: "",
    isSuggestingTitle: false,
    editingStepId: null,
  });

  // Refs
  const addActorInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Derived
  const knownActors = getUniqueActors(steps, blueprint.primary_user);
  const primaryUser = blueprint.primary_user?.trim() || "";

  // ---- Focus management ----
  useEffect(() => {
    if (!isCapturing) return;
    if (phase === "actor" && showAddActor) {
      setTimeout(() => addActorInputRef.current?.focus(), 50);
    } else if (phase === "location") {
      setTimeout(() => locationInputRef.current?.focus(), 50);
    } else if (phase === "description") {
      setTimeout(() => descTextareaRef.current?.focus(), 50);
    } else if (phase === "title") {
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [phase, isCapturing, showAddActor]);

  // ---- Transition helper ----
  const transitionPhase = useCallback(
    (next: CapturePhase, fn?: () => void) => {
      setPhaseVisible(false);
      setTimeout(() => {
        fn?.();
        setPhase(next);
        setPhaseVisible(true);
      }, 200);
    },
    []
  );

  // ---- Start capturing a new step ----
  function startCapture(defaultActor?: string) {
    const actor = defaultActor ?? primaryUser;
    setCapture({
      actor,
      location: "",
      description: "",
      suggestedTitle: "",
      title: "",
      isSuggestingTitle: false,
      editingStepId: null,
    });
    setAddActorInput("");
    setShowAddActor(false);
    setPhase("actor");
    setPhaseVisible(true);
    setIsCapturing(true);
  }

  // ---- Start editing an existing step ----
  function startEdit(step: Step) {
    setCapture({
      actor: step.actor?.trim() || primaryUser,
      location: step.location?.trim() || "",
      description: step.description ?? "",
      suggestedTitle: "",
      title: step.title,
      isSuggestingTitle: false,
      editingStepId: step.id,
    });
    setAddActorInput("");
    setShowAddActor(false);
    setPhase("actor");
    setPhaseVisible(true);
    setIsCapturing(true);
  }

  // ---- Cancel ----
  function cancelCapture() {
    setPhaseVisible(false);
    setTimeout(() => {
      setIsCapturing(false);
      setPhaseVisible(true);
    }, 200);
  }

  // ---- Phase 1: Actor → Phase 2: Location ----
  function handleActorNext() {
    const finalActor =
      showAddActor && addActorInput.trim()
        ? addActorInput.trim()
        : capture.actor;

    transitionPhase("location", () => {
      setCapture((prev) => ({ ...prev, actor: finalActor }));
      setShowAddActor(false);
      setAddActorInput("");
    });
  }

  // ---- Phase 2: Location → Phase 3: Description ----
  function handleLocationNext() {
    transitionPhase("description");
  }

  // ---- Phase 3: Description → Phase 4: Title (with AI suggestion) ----
  async function handleDescriptionNext() {
    if (!capture.description.trim()) return;

    transitionPhase("title", () => {
      setCapture((prev) => ({
        ...prev,
        isSuggestingTitle: true,
        suggestedTitle: "",
        title: "",
      }));
    });

    try {
      const res = await fetch("/api/suggest-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: capture.description,
          actor: capture.actor || undefined,
          location: capture.location || undefined,
        }),
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
    setIsSaving(true);

    try {
      if (capture.editingStepId) {
        // Update
        const { error } = await supabase
          .from("steps")
          .update({
            title: capture.title.trim(),
            description: capture.description.trim() || null,
            actor: capture.actor.trim() || null,
            location: capture.location.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", capture.editingStepId);

        if (error) throw error;

        setSteps((prev) =>
          prev.map((s) =>
            s.id === capture.editingStepId
              ? {
                  ...s,
                  title: capture.title.trim(),
                  description: capture.description.trim() || null,
                  actor: capture.actor.trim() || null,
                  location: capture.location.trim() || null,
                }
              : s
          )
        );
      } else {
        // Insert
        const newOrderIndex = steps.length;

        const { data, error } = await supabase
          .from("steps")
          .insert({
            blueprint_id: blueprint.id,
            title: capture.title.trim(),
            description: capture.description.trim() || null,
            actor: capture.actor.trim() || null,
            location: capture.location.trim() || null,
            order_index: newOrderIndex,
          })
          .select("*")
          .single();

        if (error || !data) throw error ?? new Error("Failed to save step");

        setSteps((prev) => [...prev, data as Step]);
      }

      if (goToOverview) {
        router.push(`/app/blueprints/${blueprint.id}/overview`);
        return;
      }

      // Loop — reset for next step, keep same actor
      const keepActor = capture.actor;
      setPhaseVisible(false);
      setTimeout(() => {
        setCapture({
          actor: keepActor,
          location: "",
          description: "",
          suggestedTitle: "",
          title: "",
          isSuggestingTitle: false,
          editingStepId: null,
        });
        setShowAddActor(false);
        setAddActorInput("");
        setPhase("actor");
        setPhaseVisible(true);
      }, 200);
    } catch (err) {
      console.error("Failed to save step:", err);
    } finally {
      setIsSaving(false);
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

  function handleAddActorKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleActorNext();
    }
  }

  // ---- Phase label ----
  const phaseNumber = { actor: 1, location: 2, description: 3, title: 4 }[phase];

  // ---- Render ----
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* ------------------------------------------------------------------ */}
      {/* Minimal top nav */}
      {/* ------------------------------------------------------------------ */}
      <nav className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-neutral-100">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          MakersMark
        </Link>
        <Link
          href={`/app/blueprints/${blueprint.id}/overview`}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          View overview
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Storyboard strip */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-shrink-0">
        <StoryboardStrip
          steps={steps}
          blueprint={blueprint}
          editingStepId={capture.editingStepId}
          onSelectStep={startEdit}
          onAddStepForActor={(actor) => startCapture(actor)}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main capture area */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 overflow-y-auto">
        {/* Empty / idle state */}
        {!isCapturing && (
          <div
            className={`text-center transition-all duration-300 ${
              phaseVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <div className="mb-8">
              <div className="inline-flex w-12 h-12 rounded-2xl bg-primary-50 items-center justify-center mb-5">
                <Plus className="w-5 h-5 text-primary-500" />
              </div>
              {steps.length === 0 ? (
                <>
                  <h1 className="text-3xl font-bold text-neutral-900 mb-3 leading-tight">
                    Ready to map the journey?
                  </h1>
                  <p className="text-base text-neutral-400 leading-relaxed max-w-sm mx-auto">
                    Capture each step of the service experience, one moment at a time.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                    {steps.length} step{steps.length !== 1 ? "s" : ""} captured
                  </h1>
                  <p className="text-sm text-neutral-400">
                    Keep going, or view the overview.
                  </p>
                </>
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => startCapture()}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm"
              >
                {steps.length === 0 ? "Capture first step" : "Add next step"}
                <ArrowRight className="w-4 h-4" />
              </button>
              {steps.length > 0 && (
                <Link
                  href={`/app/blueprints/${blueprint.id}/overview`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-600 text-sm font-medium hover:bg-neutral-50 transition-colors"
                >
                  View blueprint
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Capture / edit wizard */}
        {isCapturing && (
          <div className="w-full max-w-[560px]">
            {/* Phase indicator */}
            <div className="flex items-center gap-3 mb-8">
              <span className="text-xs text-neutral-400 tabular-nums">
                {phaseNumber} of 4
              </span>
              <div className="flex items-center gap-1">
                {([1, 2, 3, 4] as const).map((n) => (
                  <div
                    key={n}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      n < phaseNumber
                        ? "w-4 bg-primary-400"
                        : n === phaseNumber
                        ? "w-6 bg-primary-600"
                        : "w-4 bg-neutral-200"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={cancelCapture}
                className="ml-auto text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* ---- Phase 1: Actor ---- */}
            <div
              className={`transition-all duration-200 ${
                phaseVisible && phase === "actor"
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2 pointer-events-none absolute"
              }`}
            >
              {phase === "actor" && (
                <>
                  <h2 className="text-3xl font-bold text-neutral-900 mb-2 leading-tight">
                    Who is this step happening to?
                  </h2>
                  <p className="text-sm text-neutral-400 mb-8">
                    Select an actor or add someone new.
                  </p>

                  {/* Actor chips */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {knownActors.map((actor) => {
                      const isSelected =
                        !showAddActor && capture.actor === actor;
                      return (
                        <button
                          key={actor}
                          type="button"
                          onClick={() => {
                            setCapture((prev) => ({ ...prev, actor }));
                            setShowAddActor(false);
                          }}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${
                            isSelected
                              ? "bg-primary-600 text-white shadow-sm"
                              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                          }`}
                        >
                          {actor === primaryUser && (
                            <span
                              className={`text-xs ${
                                isSelected ? "text-primary-200" : "text-neutral-400"
                              }`}
                            >
                              ★
                            </span>
                          )}
                          {actor}
                        </button>
                      );
                    })}

                    {/* Add someone else */}
                    {!showAddActor && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddActor(true);
                          setCapture((prev) => ({ ...prev, actor: "" }));
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-neutral-400 border border-dashed border-neutral-300 hover:border-neutral-400 hover:text-neutral-600 transition-all duration-150"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add someone else
                      </button>
                    )}
                  </div>

                  {/* Inline new actor input */}
                  {showAddActor && (
                    <div className="mb-6">
                      <input
                        ref={addActorInputRef}
                        type="text"
                        value={addActorInput}
                        onChange={(e) => setAddActorInput(e.target.value)}
                        onKeyDown={handleAddActorKeyDown}
                        placeholder="e.g. Support agent, Case worker…"
                        className="w-full bg-transparent text-lg text-neutral-800 placeholder:text-neutral-300 focus:outline-none border-b-2 border-neutral-200 focus:border-primary-400 transition-colors duration-200 pb-3"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddActor(false);
                          setAddActorInput("");
                          setCapture((prev) => ({
                            ...prev,
                            actor: primaryUser,
                          }));
                        }}
                        className="mt-2 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                      >
                        ← Back to selection
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleActorNext}
                      disabled={
                        showAddActor
                          ? !addActorInput.trim()
                          : !capture.actor
                      }
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Skip — use primary user
                        transitionPhase("location", () => {
                          setCapture((prev) => ({
                            ...prev,
                            actor: primaryUser,
                          }));
                          setShowAddActor(false);
                          setAddActorInput("");
                        });
                      }}
                      className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      Skip →
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ---- Phase 2: Location ---- */}
            <div
              className={`transition-all duration-200 ${
                phaseVisible && phase === "location"
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2 pointer-events-none absolute"
              }`}
            >
              {phase === "location" && (
                <>
                  <h2 className="text-3xl font-bold text-neutral-900 mb-2 leading-tight">
                    Where is this happening?
                  </h2>
                  <p className="text-sm text-neutral-400 mb-8">
                    Optional — skip if not relevant.
                  </p>

                  <input
                    ref={locationInputRef}
                    type="text"
                    value={capture.location}
                    onChange={(e) =>
                      setCapture((prev) => ({ ...prev, location: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleLocationNext();
                      }
                    }}
                    placeholder="Online portal, Phone call, Branch office…"
                    className="w-full bg-transparent text-xl text-neutral-800 placeholder:text-neutral-300 focus:outline-none border-b-2 border-neutral-200 focus:border-primary-400 transition-colors duration-200 pb-3 mb-8"
                  />

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleLocationNext}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
                    >
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => transitionPhase("description")}
                      className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      Skip →
                    </button>
                    <button
                      type="button"
                      onClick={() => transitionPhase("actor")}
                      className="ml-auto text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      ← Back
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ---- Phase 3: Description ---- */}
            <div
              className={`transition-all duration-200 ${
                phaseVisible && phase === "description"
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2 pointer-events-none absolute"
              }`}
            >
              {phase === "description" && (
                <>
                  {/* Context chips */}
                  <div className="flex items-center gap-2 mb-6">
                    {capture.actor && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100">
                        <User className="w-3 h-3" />
                        {capture.actor}
                      </span>
                    )}
                    {capture.location && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                        <MapPin className="w-3 h-3" />
                        {capture.location}
                      </span>
                    )}
                  </div>

                  <h2 className="text-3xl font-bold text-neutral-900 mb-8 leading-tight">
                    Describe what is happening at this moment.
                  </h2>

                  <textarea
                    ref={descTextareaRef}
                    value={capture.description}
                    onChange={(e) =>
                      setCapture((prev) => ({ ...prev, description: e.target.value }))
                    }
                    onKeyDown={handleDescriptionKeyDown}
                    placeholder="What does the person do, see, or experience?"
                    rows={5}
                    className="w-full resize-none bg-transparent text-lg text-neutral-800 placeholder:text-neutral-300 focus:outline-none leading-relaxed border-b-2 border-neutral-200 focus:border-primary-400 transition-colors duration-200 pb-3 mb-2"
                  />
                  <p className="text-xs text-neutral-400 mb-8">
                    ⌘ + Enter to continue
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleDescriptionNext}
                      disabled={!capture.description.trim()}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => transitionPhase("location")}
                      className="ml-auto text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      ← Back
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ---- Phase 4: Title ---- */}
            <div
              className={`transition-all duration-200 ${
                phaseVisible && phase === "title"
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2 pointer-events-none absolute"
              }`}
            >
              {phase === "title" && (
                <>
                  {/* Context + description preview */}
                  <div className="flex items-center gap-2 mb-4">
                    {capture.actor && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100">
                        <User className="w-3 h-3" />
                        {capture.actor}
                      </span>
                    )}
                    {capture.location && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                        <MapPin className="w-3 h-3" />
                        {capture.location}
                      </span>
                    )}
                  </div>

                  {capture.description && (
                    <p className="text-sm text-neutral-400 leading-relaxed mb-6 line-clamp-2">
                      {capture.description}
                    </p>
                  )}

                  <h2 className="text-3xl font-bold text-neutral-900 mb-8 leading-tight">
                    Give this step a short title.
                  </h2>

                  <div className="mb-8">
                    {capture.isSuggestingTitle ? (
                      <div className="flex items-center gap-3 border-b-2 border-neutral-200 pb-3">
                        <span className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin flex-shrink-0" />
                        <span className="text-lg text-neutral-400">
                          Suggesting title…
                        </span>
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

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleConfirm()}
                      disabled={
                        !capture.title.trim() ||
                        isSaving ||
                        capture.isSuggestingTitle
                      }
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSaving ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving…
                        </>
                      ) : capture.editingStepId ? (
                        <>
                          Update step
                          <Check className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Add step →
                          <Check className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirm(true)}
                      disabled={
                        !capture.title.trim() ||
                        isSaving ||
                        capture.isSuggestingTitle
                      }
                      className="text-sm text-neutral-400 hover:text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {capture.editingStepId
                        ? "Update — view blueprint"
                        : "Add — view blueprint"}
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
        )}
      </div>
    </div>
  );
}
