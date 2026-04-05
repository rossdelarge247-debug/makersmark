-- =============================================================================
-- Migration 001: Projects Model
-- =============================================================================
-- Introduces a proper projects table, separates blueprint_steps from
-- journey_steps, adds user_journeys as a first-class entity, and enhances
-- swimlane types + lifecycle tracking fields.
--
-- Run this in the Supabase SQL editor. It is idempotent where possible.
-- Back up your data before running.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create projects table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL DEFAULT 'Untitled project',
  description     text,
  status          text NOT NULL DEFAULT 'draft',
  lifecycle_stages jsonb,           -- ordered string array e.g. ["Discovery","Research","Decision"]
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own projects"
  ON projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. Migrate existing blueprints data into projects
--    Each blueprint becomes one project (1:1 at this point)
-- ---------------------------------------------------------------------------

INSERT INTO projects (id, user_id, title, description, status, created_at, updated_at)
SELECT id, user_id, title, COALESCE(description, ''), status, created_at, updated_at
FROM blueprints
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Alter blueprints table
--    - Add project_id FK
--    - Add name, type (blueprint-specific identity)
--    - Add lifecycle_stage, time_estimate, metrics (future enhancement fields)
--    - Keep primary_user, user_goal, scenario, end_condition, actor_roles
--    - Remove title, description, status (now live on projects)
-- ---------------------------------------------------------------------------

ALTER TABLE blueprints
  ADD COLUMN IF NOT EXISTS project_id    uuid REFERENCES projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name          text NOT NULL DEFAULT 'As-is',
  ADD COLUMN IF NOT EXISTS type          text NOT NULL DEFAULT 'as_is',
  ADD COLUMN IF NOT EXISTS lifecycle_stage text,
  ADD COLUMN IF NOT EXISTS time_estimate text,
  ADD COLUMN IF NOT EXISTS metrics       jsonb;

-- Point each blueprint to its corresponding project (same ID at this stage)
UPDATE blueprints SET project_id = id WHERE project_id IS NULL;

-- Make project_id NOT NULL now that all rows are populated
ALTER TABLE blueprints ALTER COLUMN project_id SET NOT NULL;

-- Drop columns that have moved to projects
ALTER TABLE blueprints
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS status;

-- ---------------------------------------------------------------------------
-- 4. Create blueprint_steps table (replaces steps as blueprint columns)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blueprint_steps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id   uuid NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  title          text NOT NULL DEFAULT '',
  description    text,
  order_index    int  NOT NULL DEFAULT 0,
  service_moment text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blueprint_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage blueprint steps via blueprint ownership"
  ON blueprint_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blueprints b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = blueprint_steps.blueprint_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blueprints b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = blueprint_steps.blueprint_id
        AND p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Migrate existing steps → blueprint_steps (keep same IDs)
-- ---------------------------------------------------------------------------

INSERT INTO blueprint_steps (id, blueprint_id, title, description, order_index, service_moment, created_at, updated_at)
SELECT id, blueprint_id, title, description, order_index, service_moment, created_at, updated_at
FROM steps
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Re-point cells.step_id FK to blueprint_steps
--    (IDs are preserved so existing data is valid — just update the constraint)
-- ---------------------------------------------------------------------------

ALTER TABLE cells
  DROP CONSTRAINT IF EXISTS cells_step_id_fkey;

ALTER TABLE cells
  ADD CONSTRAINT cells_step_id_fkey
  FOREIGN KEY (step_id) REFERENCES blueprint_steps(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 7. Update swimlanes.type with proper values
--    Seed types based on default swimlane names
-- ---------------------------------------------------------------------------

UPDATE swimlanes SET type = 'evidence'   WHERE LOWER(name) LIKE '%evidence%'   AND type = 'default';
UPDATE swimlanes SET type = 'customer'   WHERE LOWER(name) LIKE '%user action%' AND type = 'default';
UPDATE swimlanes SET type = 'frontstage' WHERE LOWER(name) LIKE '%frontstage%'  AND type = 'default';
UPDATE swimlanes SET type = 'backstage'  WHERE LOWER(name) LIKE '%backstage%'   AND type = 'default';
UPDATE swimlanes SET type = 'support'    WHERE LOWER(name) LIKE '%support%'     AND type = 'default';
-- Any remaining 'default' type becomes 'custom'
UPDATE swimlanes SET type = 'custom' WHERE type = 'default';

-- ---------------------------------------------------------------------------
-- 8. Create user_journeys table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_journeys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  blueprint_id    uuid REFERENCES blueprints(id) ON DELETE SET NULL,  -- soft link
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL DEFAULT 'Untitled journey',
  description     text,
  lifecycle_stage text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own journeys"
  ON user_journeys FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 9. Create journey_steps table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS journey_steps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id     uuid NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
  project_id     uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title          text NOT NULL DEFAULT '',
  description    text,
  order_index    int  NOT NULL DEFAULT 0,
  actor          text,
  location       text,
  service_moment text,
  visual_id      uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE journey_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage journey steps via journey ownership"
  ON journey_steps FOR ALL
  USING (auth.uid() = (SELECT user_id FROM user_journeys WHERE id = journey_steps.journey_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM user_journeys WHERE id = journey_steps.journey_id));

-- ---------------------------------------------------------------------------
-- 10. Update visuals table to support journey_steps
--     Add journey_id column (nullable for backwards compatibility)
--     step_id continues to work for blueprint_steps until storyboard rebuilt
-- ---------------------------------------------------------------------------

ALTER TABLE visuals
  ADD COLUMN IF NOT EXISTS journey_id uuid REFERENCES user_journeys(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 11. Update notes RLS to work through new project ownership chain
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can manage their own notes" ON notes;

CREATE POLICY "Users can manage notes via blueprint ownership"
  ON notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blueprints b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = notes.blueprint_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blueprints b
      JOIN projects p ON p.id = b.project_id
      WHERE b.id = notes.blueprint_id
        AND p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 12. Drop steps table (data migrated to blueprint_steps)
--     NOTE: Only run this after verifying blueprint_steps data is correct.
--     Comment out if you want to keep steps as a safety net initially.
-- ---------------------------------------------------------------------------

-- DROP TABLE IF EXISTS steps;

-- ---------------------------------------------------------------------------
-- 13. Helper: updated_at trigger for new tables
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_journeys_updated_at
  BEFORE UPDATE ON user_journeys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER journey_steps_updated_at
  BEFORE UPDATE ON journey_steps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER blueprint_steps_updated_at
  BEFORE UPDATE ON blueprint_steps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
