// =============================================================================
// Core domain types
// =============================================================================

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  organisation: string | null;
  status: string;
  lifecycle_stages: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Blueprint {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  type: "as_is" | "to_be";
  primary_user: string | null;
  user_goal: string | null;
  end_condition: string | null;
  scenario: string | null;
  actor_roles: Record<string, "customer" | "frontstage" | "backstage"> | null;
  lifecycle_stage: string | null;
  time_estimate: string | null;
  metrics: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface BlueprintStep {
  id: string;
  blueprint_id: string;
  title: string;
  description: string | null;
  order_index: number;
  service_moment: string | null;
  // Optional fields retained for UI compatibility — not stored in blueprint_steps table
  actor?: string | null;
  location?: string | null;
  visual_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Swimlane {
  id: string;
  blueprint_id: string;
  name: string;
  type: "evidence" | "customer" | "frontstage" | "backstage" | "support" | "custom";
  order_index: number;
  created_at: string;
}

export interface Cell {
  id: string;
  blueprint_id: string;
  step_id: string;
  swimlane_id: string;
  content: string | null;
  updated_at: string;
}

export interface UserJourney {
  id: string;
  project_id: string;
  blueprint_id: string | null;
  user_id: string;
  name: string;
  description: string | null;
  lifecycle_stage: string | null;
  created_at: string;
  updated_at: string;
}

export interface JourneyStep {
  id: string;
  journey_id: string;
  project_id: string;
  title: string;
  description: string | null;
  order_index: number;
  actor: string | null;
  location: string | null;
  service_moment: string | null;
  visual_id: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Notes
// =============================================================================

export type NoteCategory =
  | "assumption"
  | "unknown"
  | "research_insight"
  | "pain_point"
  | "data"
  | "opportunity";

export interface Note {
  id: string;
  blueprint_id: string;
  target_type: "step" | "cell";
  target_id: string;
  category: NoteCategory;
  content: string;
  source_type: "user" | "ai_response" | "ai_accept";
  parent_note_id: string | null;
  created_at: string;
}

// =============================================================================
// Visuals (storyboard — parked, kept for data compatibility)
// =============================================================================

export interface Visual {
  id: string;
  blueprint_id: string;
  step_id: string;
  journey_id: string | null;
  url: string;
  prompt: string | null;
  created_at: string;
}

// =============================================================================
// AI
// =============================================================================

export type InterrogationGroupType =
  | "consideration"
  | "research_question"
  | "assumption"
  | "risk"
  | "opportunity";

export interface AIInterrogation {
  id: string;
  blueprint_id: string;
  target_type: "step" | "cell";
  target_id: string;
  created_at: string;
}

export interface AISuggestionItem {
  id: string;
  interrogation_id: string;
  blueprint_id: string;
  group_type: InterrogationGroupType;
  content: string;
  status: "new" | "accepted" | "responded" | "dismissed";
  response_text: string | null;
  saved_note_id: string | null;
  saved_cell_id: string | null;
  created_at: string;
}
