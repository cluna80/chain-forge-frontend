/*
# Switch chains table from owner-scoped (authenticated) to single-tenant (anon+authenticated)

1. Security changes
- Drop the 4 existing owner-scoped policies (select/insert/update/delete for authenticated only).
- Replace with 4 new policies scoped to anon, authenticated (single-tenant, no auth screen).
- The app now runs as the anon role with no sign-in, so policies must include anon or the table appears empty.
- Data is intentionally shared/public within this single-tenant app.

2. Notes
- No structural changes to the table itself.
- user_id column remains but is nullable now that auth is optional; inserts no longer require a session.
*/

ALTER TABLE chains ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "select_own_chains" ON chains;
CREATE POLICY "anon_select_chains" ON chains FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_chains" ON chains;
CREATE POLICY "anon_insert_chains" ON chains FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_chains" ON chains;
CREATE POLICY "anon_update_chains" ON chains FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_own_chains" ON chains;
CREATE POLICY "anon_delete_chains" ON chains FOR DELETE
  TO anon, authenticated USING (true);
