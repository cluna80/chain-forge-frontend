/*
# Create chains table for Chain Forge

1. New Tables
- `chains` — stores blockchain configurations created by users in the Chain Forge wizard.
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to authenticated user, references auth.users with cascade delete)
  - `name` (text, not null) — display name of the chain
  - `chain_id` (text, not null) — on-chain chain identifier (e.g. "qcb-1")
  - `status` (text, not null, default 'draft') — one of: draft, building, running, failed
  - `engine_version` (text, not null, default '0.1.0') — Chain Forge engine version
  - `config` (jsonb, not null, default '{}') — full wizard configuration object
  - `genesis_json` (jsonb, nullable) — generated genesis configuration
  - `build_logs` (text, nullable) — streamed build/compile log output
  - `node_status` (jsonb, nullable) — runtime node status info when chain is running
  - `explorer_url` (text, nullable) — link to block explorer
  - `repo_url` (text, nullable) — link to source repo
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Indexes
- Index on `user_id` for efficient per-user queries.
- Index on `status` for filtering by chain state.

3. Security
- Enable RLS on `chains`.
- Owner-scoped CRUD: each authenticated user can only access rows they own.
- Four separate policies for SELECT, INSERT, UPDATE, DELETE.
- `user_id` defaults to `auth.uid()` so inserts that omit it still satisfy the WITH CHECK.
*/

CREATE TABLE IF NOT EXISTS chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  chain_id text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'building', 'running', 'failed')),
  engine_version text NOT NULL DEFAULT '0.1.0',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  genesis_json jsonb,
  build_logs text,
  node_status jsonb,
  explorer_url text,
  repo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chains_user_id ON chains(user_id);
CREATE INDEX IF NOT EXISTS idx_chains_status ON chains(status);

ALTER TABLE chains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chains" ON chains;
CREATE POLICY "select_own_chains" ON chains FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chains" ON chains;
CREATE POLICY "insert_own_chains" ON chains FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chains" ON chains;
CREATE POLICY "update_own_chains" ON chains FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chains" ON chains;
CREATE POLICY "delete_own_chains" ON chains FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
