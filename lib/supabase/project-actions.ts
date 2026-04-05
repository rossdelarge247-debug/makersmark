"use server";

import { createClient } from "@/lib/supabase/server";
import type { Project, Blueprint } from "@/lib/types/blueprint";

export type { Project, Blueprint };

// ---------------------------------------------------------------------------
// Default swimlanes (seeded when a blueprint is created)
// ---------------------------------------------------------------------------

const DEFAULT_SWIMLANES = [
  { name: "Physical / digital evidence", type: "evidence" },
  { name: "User actions",                type: "customer" },
  { name: "Frontstage actions",          type: "frontstage" },
  { name: "Backstage actions",           type: "backstage" },
  { name: "Support processes / systems", type: "support" },
] as const;

// ---------------------------------------------------------------------------
// Project CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a new project and seeds an initial As-is blueprint with default swimlanes.
 * Returns the new project id.
 */
export async function createProject(
  title?: string,
  description?: string
): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 1. Create project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title: title?.trim() || "Untitled project",
      description: description?.trim() || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (projectError || !project) throw new Error(projectError?.message ?? "Failed to create project");

  // 2. Create initial As-is blueprint
  const { data: blueprint, error: blueprintError } = await supabase
    .from("blueprints")
    .insert({
      project_id: project.id,
      user_id: user.id,
      name: "As-is",
      type: "as_is",
    })
    .select("id")
    .single();

  if (blueprintError || !blueprint) throw new Error(blueprintError?.message ?? "Failed to create blueprint");

  // 3. Seed default swimlanes
  await seedDefaultSwimlanes(blueprint.id);

  return project.id;
}

/**
 * Returns all projects for the authenticated user, newest first.
 */
export async function getUserProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Project[];
}

/**
 * Returns a single project by id, with ownership check.
 */
export async function getProjectById(id: string): Promise<Project> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Project not found");
  return data as Project;
}

/**
 * Updates mutable project fields.
 */
export async function updateProjectMeta(
  id: string,
  fields: Partial<Pick<Project, "title" | "description" | "status" | "lifecycle_stages">>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * Deletes a project and all its children (blueprints, journeys, etc.) via cascade.
 */
export async function deleteProject(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Blueprint queries (project-scoped)
// ---------------------------------------------------------------------------

/**
 * Returns all blueprints for a given project.
 */
export async function getBlueprintsForProject(projectId: string): Promise<Blueprint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blueprints")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Blueprint[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function seedDefaultSwimlanes(blueprintId: string): Promise<void> {
  const supabase = await createClient();
  const rows = DEFAULT_SWIMLANES.map((s, index) => ({
    blueprint_id: blueprintId,
    name: s.name,
    type: s.type,
    order_index: index,
  }));

  const { error } = await supabase.from("swimlanes").insert(rows);
  if (error) throw new Error(error.message);
}
