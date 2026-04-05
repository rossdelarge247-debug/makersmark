"use server";

import { createClient } from "@/lib/supabase/server";
import type { UserJourney, JourneyStep, Visual } from "@/lib/types/blueprint";

export type { UserJourney, JourneyStep };

// ---------------------------------------------------------------------------
// User Journey CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a new user journey within a project.
 */
export async function createJourney(
  projectId: string,
  { name = "Untitled journey", description, blueprintId }:
  { name?: string; description?: string | null; blueprintId?: string | null } = {}
): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("user_journeys")
    .insert({
      project_id: projectId,
      user_id: user.id,
      name,
      description: description ?? null,
      blueprint_id: blueprintId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create journey");
  return data.id as string;
}

/**
 * Returns all journeys for a project, ordered newest first.
 */
export async function getJourneysForProject(projectId: string): Promise<UserJourney[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_journeys")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as UserJourney[];
}

/**
 * Returns a single journey by id.
 */
export async function getJourneyById(id: string): Promise<UserJourney | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_journeys")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;
  return data as UserJourney;
}

/**
 * Updates journey metadata.
 */
export async function updateJourneyMeta(
  id: string,
  fields: Partial<Pick<UserJourney, "name" | "description" | "blueprint_id" | "lifecycle_stage">>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_journeys")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Deletes a journey and all its steps.
 */
export async function deleteJourney(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("user_journeys").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Journey steps CRUD
// ---------------------------------------------------------------------------

/**
 * Fetches all steps for a journey, ordered by order_index.
 */
export async function getStepsForJourney(journeyId: string): Promise<JourneyStep[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journey_steps")
    .select("*")
    .eq("journey_id", journeyId)
    .order("order_index", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as JourneyStep[];
}

/**
 * Creates a new step in a journey.
 */
export async function createJourneyStep(
  journeyId: string,
  projectId: string,
  {
    title = "Untitled step",
    description,
    orderIndex = 0,
    actor,
    location,
    service_moment,
  }: {
    title?: string;
    description?: string | null;
    orderIndex?: number;
    actor?: string | null;
    location?: string | null;
    service_moment?: string | null;
  } = {}
): Promise<JourneyStep> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journey_steps")
    .insert({
      journey_id: journeyId,
      project_id: projectId,
      title,
      description: description ?? null,
      order_index: orderIndex,
      actor: actor ?? null,
      location: location ?? null,
      service_moment: service_moment ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create journey step");
  return data as JourneyStep;
}

/**
 * Updates a journey step.
 */
export async function updateJourneyStep(
  id: string,
  fields: Partial<Pick<JourneyStep, "title" | "description" | "actor" | "location" | "service_moment" | "visual_id">>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("journey_steps")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Reorders journey steps.
 */
export async function reorderJourneySteps(journeyId: string, orderedIds: string[]): Promise<void> {
  const supabase = await createClient();
  const updates = orderedIds.map((stepId, index) =>
    supabase.from("journey_steps").update({ order_index: index }).eq("id", stepId).eq("journey_id", journeyId)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

/**
 * Deletes a journey step.
 */
export async function deleteJourneyStep(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("journey_steps").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Visuals for journey steps
// ---------------------------------------------------------------------------

export async function getVisualsForJourney(journeyId: string): Promise<Visual[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visuals")
    .select("*")
    .eq("journey_id", journeyId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Visual[];
}
