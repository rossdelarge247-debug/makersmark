export interface Blueprint {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  primary_user: string | null;
  user_goal: string | null;
  end_condition: string | null;
  scenario: string | null;
  actor_roles: Record<string, "customer" | "frontstage" | "backstage"> | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Step {
  id: string;
  blueprint_id: string;
  title: string;
  description: string | null;
  order_index: number;
  actor?: string | null;
  location?: string | null;
  service_moment?: string | null;
  visual_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Swimlane {
  id: string;
  blueprint_id: string;
  name: string;
  type: string;
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

export interface Visual {
  id: string;
  blueprint_id: string;
  step_id: string;
  url: string;
  prompt: string | null;
  created_at: string;
}

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
