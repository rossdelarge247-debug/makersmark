"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface Blueprint {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  primary_user: string | null;
  user_goal: string | null;
  end_condition: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Creates a new blueprint row for the authenticated user.
 * Returns the new blueprint's id.
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

  return data.id as string;
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
