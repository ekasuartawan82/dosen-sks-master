-- Schedule generation snapshots.
-- Snapshots are the guardrail for scoped auto-generate/restore workflows.

CREATE TABLE IF NOT EXISTS public.schedule_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('class', 'program')),
  target_id uuid,
  academic_year text NOT NULL,
  snapshot_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedule_snapshots_target_scope_check CHECK (
    target_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS schedule_snapshots_lookup_idx
ON public.schedule_snapshots (scope, target_id, academic_year, created_at DESC);

ALTER TABLE public.schedule_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Schedule snapshots are readable by app roles" ON public.schedule_snapshots;
DROP POLICY IF EXISTS "Schedule snapshots are insertable by admins" ON public.schedule_snapshots;
DROP POLICY IF EXISTS "Schedule snapshots are updatable by admins" ON public.schedule_snapshots;
DROP POLICY IF EXISTS "Schedule snapshots are deletable by admins" ON public.schedule_snapshots;

CREATE POLICY "Schedule snapshots are readable by app roles"
ON public.schedule_snapshots FOR SELECT TO authenticated
USING (public.can_read_academic_data());

CREATE POLICY "Schedule snapshots are insertable by admins"
ON public.schedule_snapshots FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Schedule snapshots are updatable by admins"
ON public.schedule_snapshots FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Schedule snapshots are deletable by admins"
ON public.schedule_snapshots FOR DELETE TO authenticated
USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_snapshots TO authenticated;

COMMENT ON TABLE public.schedule_snapshots IS
'Scoped backups created before schedule auto-generation or restore. Restores must only affect schedules inside the recorded scope.';
