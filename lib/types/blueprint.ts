export interface Blueprint {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  primary_user: string | null;
  user_goal: string | null;
  end_condition: string | null;
  scenario: string | null;
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
