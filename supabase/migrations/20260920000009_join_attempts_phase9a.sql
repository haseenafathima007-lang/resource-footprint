-- Migration: Join attempts rate limiting for Phase 9a Task D
-- Tracks failed join code attempts per user with 5-attempt limit in 15-minute window.

-- 1. Create join_attempts table
CREATE TABLE IF NOT EXISTS public.join_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_code text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_join_attempts_user_time
  ON public.join_attempts (user_id, attempted_at DESC);

-- Enable RLS
ALTER TABLE public.join_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own join attempts
CREATE POLICY join_attempts_select_own
  ON public.join_attempts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Revoke direct writes
REVOKE INSERT, UPDATE, DELETE ON public.join_attempts FROM anon, authenticated;

-- Helper function to record attempt
CREATE OR REPLACE FUNCTION public.record_join_attempt(
  p_user_id uuid,
  p_code text,
  p_success boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.join_attempts (user_id, attempt_code, success)
  VALUES (p_user_id, p_code, p_success);
END;
$$;

-- 2. Enhanced SECURITY DEFINER RPC join_team_with_rate_limit
CREATE OR REPLACE FUNCTION public.join_team_with_rate_limit(
  p_code text,
  p_alias text,
  p_reference_profile jsonb,
  p_baseline_water_l_day numeric,
  p_baseline_energy_kwh_day numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_failed_attempts integer;
  v_result jsonb;
  v_err_msg text;
  v_err_state text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  -- Count failed attempts in the last 15 minutes
  SELECT count(*) INTO v_failed_attempts
  FROM public.join_attempts
  WHERE user_id = v_user_id
    AND success = false
    AND attempted_at >= now() - interval '15 minutes';

  IF v_failed_attempts >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMITED';
  END IF;

  -- Attempt team join
  BEGIN
    v_result := public.join_team(
      p_code,
      p_alias,
      p_reference_profile,
      p_baseline_water_l_day,
      p_baseline_energy_kwh_day
    );

    PERFORM public.record_join_attempt(v_user_id, p_code, true);
    RETURN v_result;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_msg = MESSAGE_TEXT, v_err_state = RETURNED_SQLSTATE;
    PERFORM public.record_join_attempt(v_user_id, p_code, false);
    RAISE EXCEPTION '%', v_err_msg USING ERRCODE = v_err_state;
  END;
END;
$$;
