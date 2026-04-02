"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Blueprint, Step, Swimlane, Cell, Note, NoteCategory } from "@/lib/types/blueprint";

// Re-export types for consumers that import them from this module
export type { Blueprint, Step, Swimlane, Cell, Note, NoteCategory };

// ---------------------------------------------------------------------------
// Default swimlanes
// ---------------------------------------------------------------------------

const DEFAULT_SWIMLANES = [
  "Physical / digital evidence",
  "User actions",
  "Frontstage actions",
  "Backstage actions",
  "Support processes / systems",
] as const;

// ---------------------------------------------------------------------------
// Blueprint CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a new blueprint row for the authenticated user and seeds the 5
 * default swimlanes. Returns the new blueprint's id.
 */
export async function createBlueprint({
  title = "My first blueprint",
  description = "",
}: {
  title?: string;
  description?: string;
} = {}): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("blueprints")
    .insert({
      user_id: user.id,
      title: title.trim() || "My first blueprint",
      description: description.trim() || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create blueprint");
  }

  const blueprintId = data.id as string;

  // Seed default swimlanes immediately
  await seedDefaultSwimlanes(blueprintId);

  return blueprintId;
}

/**
 * Fetches all blueprints for the authenticated user, ordered by newest first.
 */
export async function getUserBlueprints(): Promise<Blueprint[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("blueprints")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Blueprint[];
}

/**
 * Fetches a single blueprint by id, verifying it belongs to the current user.
 * Returns null if not found or unauthorised.
 */
export async function getBlueprintById(
  id: string
): Promise<Blueprint | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("blueprints")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Blueprint;
}

/**
 * Deletes a blueprint by id for the authenticated user.
 */
export async function deleteBlueprint(id: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("blueprints")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Updates blueprint metadata fields.
 */
export async function updateBlueprintMeta(
  id: string,
  fields: {
    title?: string;
    description?: string | null;
    primary_user?: string | null;
    user_goal?: string | null;
    end_condition?: string | null;
    scenario?: string | null;
    actor_roles?: Record<string, string> | null;
  }
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("blueprints")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Updates the status field of a blueprint.
 */
export async function updateBlueprintStatus(
  id: string,
  status: string
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("blueprints")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}

// ---------------------------------------------------------------------------
// Steps CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a new step for the given blueprint.
 */
export async function createStep(
  blueprintId: string,
  {
    title = "Untitled step",
    description,
    orderIndex = 0,
  }: { title?: string; description?: string | null; orderIndex?: number }
): Promise<Step> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("steps")
    .insert({
      blueprint_id: blueprintId,
      title,
      description: description ?? null,
      order_index: orderIndex,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create step");
  }

  return data as Step;
}

/**
 * Updates step title and/or description.
 */
export async function updateStep(
  id: string,
  fields: { title?: string; description?: string | null }
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("steps")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Reorders steps by updating order_index for each step in orderedIds.
 */
export async function reorderSteps(
  blueprintId: string,
  orderedIds: string[]
): Promise<void> {
  const supabase = await createClient();

  const updates = orderedIds.map((stepId, index) =>
    supabase
      .from("steps")
      .update({ order_index: index })
      .eq("id", stepId)
      .eq("blueprint_id", blueprintId)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    throw new Error(failed.error.message);
  }
}

/**
 * Deletes a step (cascade deletes its cells).
 */
export async function deleteStep(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("steps").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Fetches all steps for a blueprint, ordered by order_index.
 */
export async function getStepsForBlueprint(
  blueprintId: string
): Promise<Step[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("steps")
    .select("*")
    .eq("blueprint_id", blueprintId)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Step[];
}

// ---------------------------------------------------------------------------
// Swimlanes CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a new swimlane for the given blueprint.
 */
export async function createSwimlane(
  blueprintId: string,
  {
    name,
    type = "custom",
    orderIndex = 0,
  }: { name: string; type?: string; orderIndex?: number }
): Promise<Swimlane> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("swimlanes")
    .insert({
      blueprint_id: blueprintId,
      name,
      type,
      order_index: orderIndex,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create swimlane");
  }

  return data as Swimlane;
}

/**
 * Renames a swimlane.
 */
export async function updateSwimlane(
  id: string,
  fields: { name: string }
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("swimlanes")
    .update(fields)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Reorders swimlanes by updating order_index for each swimlane in orderedIds.
 */
export async function reorderSwimlanes(
  blueprintId: string,
  orderedIds: string[]
): Promise<void> {
  const supabase = await createClient();

  const updates = orderedIds.map((swimlaneId, index) =>
    supabase
      .from("swimlanes")
      .update({ order_index: index })
      .eq("id", swimlaneId)
      .eq("blueprint_id", blueprintId)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    throw new Error(failed.error.message);
  }
}

/**
 * Deletes a swimlane (cascade deletes its cells).
 */
export async function deleteSwimlane(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("swimlanes").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Fetches all swimlanes for a blueprint, ordered by order_index.
 */
export async function getSwimlanesForBlueprint(
  blueprintId: string
): Promise<Swimlane[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("swimlanes")
    .select("*")
    .eq("blueprint_id", blueprintId)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Swimlane[];
}

/**
 * Seeds the 5 default swimlanes for a new blueprint.
 */
export async function seedDefaultSwimlanes(blueprintId: string): Promise<void> {
  const supabase = await createClient();

  const rows = DEFAULT_SWIMLANES.map((name, index) => ({
    blueprint_id: blueprintId,
    name,
    type: "default",
    order_index: index,
  }));

  const { error } = await supabase.from("swimlanes").insert(rows);

  if (error) {
    throw new Error(error.message);
  }
}

// ---------------------------------------------------------------------------
// Cells CRUD
// ---------------------------------------------------------------------------

/**
 * Inserts or updates cell content at a step/swimlane intersection.
 */
export async function upsertCell(
  blueprintId: string,
  stepId: string,
  swimlaneId: string,
  content: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("cells").upsert(
    {
      blueprint_id: blueprintId,
      step_id: stepId,
      swimlane_id: swimlaneId,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "step_id,swimlane_id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Fetches all cells for a blueprint.
 */
export async function getCellsForBlueprint(
  blueprintId: string
): Promise<Cell[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cells")
    .select("*")
    .eq("blueprint_id", blueprintId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Cell[];
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

/**
 * Fetches all notes for a blueprint, ordered oldest first.
 */
export async function getNotesForBlueprint(
  blueprintId: string
): Promise<Note[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("blueprint_id", blueprintId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Note[];
}
