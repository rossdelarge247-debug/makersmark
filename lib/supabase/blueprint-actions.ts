"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  Blueprint,
  BlueprintStep,
  Swimlane,
  Cell,
  Note,
  NoteCategory,
  Visual,
} from "@/lib/types/blueprint";

export type { Blueprint, BlueprintStep, Swimlane, Cell, Note, NoteCategory, Visual };

// ---------------------------------------------------------------------------
// Blueprint CRUD
// ---------------------------------------------------------------------------

/**
 * Returns a single blueprint by id, with user ownership check via project.
 */
export async function getBlueprintById(id: string): Promise<Blueprint | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("blueprints")
    .select("*, projects!inner(user_id)")
    .eq("id", id)
    .eq("projects.user_id", user.id)
    .single();

  if (error || !data) return null;
  // Strip the joined projects field from the returned object
  const { projects: _p, ...blueprint } = data as Blueprint & { projects: unknown };
  return blueprint as Blueprint;
}

/**
 * Creates a new blueprint for a project.
 */
export async function createBlueprint(
  projectId: string,
  fields: { name?: string; type?: "as_is" | "to_be" } = {}
): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("blueprints")
    .insert({
      project_id: projectId,
      user_id: user.id,
      name: fields.name ?? "As-is",
      type: fields.type ?? "as_is",
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create blueprint");
  return data.id as string;
}

/**
 * Deletes a blueprint.
 */
export async function deleteBlueprint(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("blueprints").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Updates blueprint metadata fields.
 */
export async function updateBlueprintMeta(
  id: string,
  fields: Partial<Pick<Blueprint,
    "name" | "primary_user" | "user_goal" | "end_condition" |
    "scenario" | "actor_roles" | "lifecycle_stage" | "time_estimate" | "metrics"
  >>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("blueprints")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Blueprint steps CRUD
// ---------------------------------------------------------------------------

/**
 * Fetches all steps for a blueprint, ordered by order_index.
 */
export async function getStepsForBlueprint(blueprintId: string): Promise<BlueprintStep[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blueprint_steps")
    .select("*")
    .eq("blueprint_id", blueprintId)
    .order("order_index", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as BlueprintStep[];
}

/**
 * Creates a new step for the given blueprint.
 */
export async function createStep(
  blueprintId: string,
  { title = "Untitled step", description, orderIndex = 0 }:
  { title?: string; description?: string | null; orderIndex?: number }
): Promise<BlueprintStep> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blueprint_steps")
    .insert({ blueprint_id: blueprintId, title, description: description ?? null, order_index: orderIndex })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create step");
  return data as BlueprintStep;
}

/**
 * Updates a blueprint step.
 */
export async function updateStep(
  id: string,
  fields: { title?: string; description?: string | null; service_moment?: string | null }
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("blueprint_steps")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Reorders blueprint steps.
 */
export async function reorderSteps(blueprintId: string, orderedIds: string[]): Promise<void> {
  const supabase = await createClient();
  const updates = orderedIds.map((stepId, index) =>
    supabase.from("blueprint_steps").update({ order_index: index }).eq("id", stepId).eq("blueprint_id", blueprintId)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

/**
 * Deletes a blueprint step (cascade deletes cells).
 */
export async function deleteStep(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("blueprint_steps").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Swimlanes CRUD
// ---------------------------------------------------------------------------

export async function getSwimlanesForBlueprint(blueprintId: string): Promise<Swimlane[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("swimlanes")
    .select("*")
    .eq("blueprint_id", blueprintId)
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Swimlane[];
}

export async function createSwimlane(
  blueprintId: string,
  { name, type = "custom", orderIndex = 0 }: { name: string; type?: string; orderIndex?: number }
): Promise<Swimlane> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("swimlanes")
    .insert({ blueprint_id: blueprintId, name, type, order_index: orderIndex })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create swimlane");
  return data as Swimlane;
}

export async function updateSwimlane(id: string, fields: { name: string }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("swimlanes").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderSwimlanes(blueprintId: string, orderedIds: string[]): Promise<void> {
  const supabase = await createClient();
  const updates = orderedIds.map((swimlaneId, index) =>
    supabase.from("swimlanes").update({ order_index: index }).eq("id", swimlaneId).eq("blueprint_id", blueprintId)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

export async function deleteSwimlane(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("swimlanes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Cells CRUD
// ---------------------------------------------------------------------------

export async function upsertCell(
  blueprintId: string,
  stepId: string,
  swimlaneId: string,
  content: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("cells").upsert(
    { blueprint_id: blueprintId, step_id: stepId, swimlane_id: swimlaneId, content, updated_at: new Date().toISOString() },
    { onConflict: "step_id,swimlane_id" }
  );
  if (error) throw new Error(error.message);
}

export async function getCellsForBlueprint(blueprintId: string): Promise<Cell[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cells").select("*").eq("blueprint_id", blueprintId);
  if (error) throw new Error(error.message);
  return (data ?? []) as Cell[];
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function getNotesForBlueprint(blueprintId: string): Promise<Note[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("blueprint_id", blueprintId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Note[];
}

// ---------------------------------------------------------------------------
// Visuals (storyboard — parked)
// ---------------------------------------------------------------------------

export async function getVisualsForBlueprint(blueprintId: string): Promise<Visual[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visuals")
    .select("*")
    .eq("blueprint_id", blueprintId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Visual[];
}
