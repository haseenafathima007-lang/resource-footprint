-- Phase 7: Teams, Shared Totals, and Privacy-First Leaderboard
-- Single timestamped migration file with RLS enabled on all tables

-- 1. Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 60),
  join_code text UNIQUE NOT NULL CHECK (join_code ~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{10}$'),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_leaderboard boolean NOT NULL DEFAULT false,
  target_resource text NULL CHECK (target_resource IS NULL OR target_resource IN ('water', 'energy')),
  target_amount numeric(12,2) NULL CHECK (target_amount IS NULL OR target_amount > 0),
  CONSTRAINT chk_team_target_pair CHECK (
    (target_resource IS NULL AND target_amount IS NULL) OR
    (target_resource IS NOT NULL AND target_amount IS NOT NULL)
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  member_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  alias text NOT NULL CHECK (char_length(trim(alias)) BETWEEN 1 AND 30 AND alias !~ '@'),
  sharing boolean NOT NULL DEFAULT false,
  reference_profile jsonb NOT NULL,
  baseline_water_l_day numeric(10,2) NOT NULL CHECK (baseline_water_l_day > 0),
  baseline_energy_kwh_day numeric(10,3) NOT NULL CHECK (baseline_energy_kwh_day > 0),
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_team_lower_alias
  ON public.team_members (team_id, lower(alias));

CREATE INDEX IF NOT EXISTS idx_team_members_user_id
  ON public.team_members (user_id);

-- 3. Create team_contributions table
CREATE TABLE IF NOT EXISTS public.team_contributions (
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  day date NOT NULL,
  water_saved_l numeric(10,2) NOT NULL CHECK (abs(water_saved_l) <= 10000),
  energy_saved_kwh numeric(10,3) NOT NULL CHECK (abs(energy_saved_kwh) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id, day),
  FOREIGN KEY (team_id, user_id) REFERENCES public.team_members(team_id, user_id) ON DELETE CASCADE
);

-- Triggers for updated_at
CREATE TRIGGER set_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_team_contributions_updated_at
  BEFORE UPDATE ON public.team_contributions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS on all 3 tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Direct table access shows a user ONLY their own rows.
-- NO client SELECT policy on teams (join_code must not leak); clients read teams only through functions.
-- RLS Policy on team_members: SELECT own rows only.
CREATE POLICY team_members_select_own ON public.team_members
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- RLS Policy on team_contributions: SELECT own rows only.
CREATE POLICY team_contributions_select_own ON public.team_contributions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Revoke all table modifications and direct access from anon and authenticated
REVOKE ALL ON public.teams FROM anon, authenticated;
REVOKE ALL ON public.team_members FROM anon, authenticated;
REVOKE ALL ON public.team_contributions FROM anon, authenticated;

-- Allow SELECT policy check access to authenticated for RLS tables
GRANT SELECT ON public.team_members TO authenticated;
GRANT SELECT ON public.team_contributions TO authenticated;


-- ============================================================================
-- Helper Function: Join Code Generator (32 base-32 chars: 23456789ABCDEFGHJKLMNPQRSTUVWXYZ)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.internal_generate_join_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  code text := '';
  bytes bytea;
  i integer;
  val integer;
BEGIN
  bytes := extensions.gen_random_bytes(10);
  FOR i IN 0..9 LOOP
    val := get_byte(bytes, i) & 31; -- 5 bits
    code := code || substr(chars, val + 1, 1);
  END LOOP;
  RETURN code;
END;
$$;


-- ============================================================================
-- SECURITY DEFINER RPC Functions
-- ============================================================================

-- 1. create_team
CREATE OR REPLACE FUNCTION public.create_team(
  p_name text,
  p_alias text,
  p_reference_profile jsonb,
  p_baseline_water_l_day numeric,
  p_baseline_energy_kwh_day numeric,
  p_target_resource text DEFAULT NULL,
  p_target_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_team_count integer;
  v_team_id uuid;
  v_join_code text;
  v_retries integer := 0;
  v_trimmed_name text;
  v_trimmed_alias text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  v_trimmed_name := trim(p_name);
  v_trimmed_alias := trim(p_alias);

  IF char_length(v_trimmed_name) < 1 OR char_length(v_trimmed_name) > 60 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  IF char_length(v_trimmed_alias) < 1 OR char_length(v_trimmed_alias) > 30 OR v_trimmed_alias ~ '@' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  IF p_baseline_water_l_day <= 0 OR p_baseline_energy_kwh_day <= 0 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  IF (p_target_resource IS NOT NULL AND p_target_amount IS NULL) OR
     (p_target_resource IS NULL AND p_target_amount IS NOT NULL) OR
     (p_target_resource IS NOT NULL AND p_target_resource NOT IN ('water', 'energy')) OR
     (p_target_amount IS NOT NULL AND p_target_amount <= 0) THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  -- Limit 5 teams per user
  SELECT count(*) INTO v_team_count
  FROM public.team_members
  WHERE user_id = v_user_id;

  IF v_team_count >= 5 THEN
    RAISE EXCEPTION 'LIMIT_REACHED';
  END IF;

  -- Generate join code retrying on unique violation
  LOOP
    v_join_code := public.internal_generate_join_code();
    BEGIN
      INSERT INTO public.teams (name, join_code, owner_id, target_resource, target_amount)
      VALUES (v_trimmed_name, v_join_code, v_user_id, p_target_resource, p_target_amount)
      RETURNING id INTO v_team_id;

      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_retries := v_retries + 1;
      IF v_retries > 10 THEN
        RAISE EXCEPTION 'UNKNOWN';
      END IF;
    END;
  END LOOP;

  -- Insert owner membership
  INSERT INTO public.team_members (
    team_id, user_id, role, alias, sharing, reference_profile, baseline_water_l_day, baseline_energy_kwh_day
  ) VALUES (
    v_team_id, v_user_id, 'owner', v_trimmed_alias, false, p_reference_profile, p_baseline_water_l_day, p_baseline_energy_kwh_day
  );

  RETURN jsonb_build_object(
    'id', v_team_id,
    'join_code', v_join_code
  );
END;
$$;


-- 2. join_team
CREATE OR REPLACE FUNCTION public.join_team(
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
  v_normalized_code text;
  v_team record;
  v_team_count integer;
  v_member_count integer;
  v_trimmed_alias text;
  v_existing_member integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  v_normalized_code := upper(regexp_replace(p_code, '[\s-]', '', 'g'));
  v_trimmed_alias := trim(p_alias);

  IF char_length(v_trimmed_alias) < 1 OR char_length(v_trimmed_alias) > 30 OR v_trimmed_alias ~ '@' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  IF p_baseline_water_l_day <= 0 OR p_baseline_energy_kwh_day <= 0 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  -- Find team by code
  SELECT * INTO v_team
  FROM public.teams
  WHERE join_code = v_normalized_code;

  IF v_team.id IS NULL THEN
    RAISE EXCEPTION 'INVALID_CODE';
  END IF;

  -- Check if user is already a member
  SELECT count(*) INTO v_existing_member
  FROM public.team_members
  WHERE team_id = v_team.id AND user_id = v_user_id;

  IF v_existing_member > 0 THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  -- Check user 5-team limit
  SELECT count(*) INTO v_team_count
  FROM public.team_members
  WHERE user_id = v_user_id;

  IF v_team_count >= 5 THEN
    RAISE EXCEPTION 'LIMIT_REACHED';
  END IF;

  -- Check team member limit (max 50)
  SELECT count(*) INTO v_member_count
  FROM public.team_members
  WHERE team_id = v_team.id;

  IF v_member_count >= 50 THEN
    RAISE EXCEPTION 'TEAM_FULL';
  END IF;

  -- Check alias conflict in team
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = v_team.id AND lower(alias) = lower(v_trimmed_alias)
  ) THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  -- Insert member
  INSERT INTO public.team_members (
    team_id, user_id, role, alias, sharing, reference_profile, baseline_water_l_day, baseline_energy_kwh_day
  ) VALUES (
    v_team.id, v_user_id, 'member', v_trimmed_alias, false, p_reference_profile, p_baseline_water_l_day, p_baseline_energy_kwh_day
  );

  RETURN jsonb_build_object(
    'team_id', v_team.id,
    'name', v_team.name
  );
END;
$$;


-- 3. leave_team
CREATE OR REPLACE FUNCTION public.leave_team(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_role text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT role INTO v_role
  FROM public.team_members
  WHERE team_id = p_team_id AND user_id = v_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_role = 'owner' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  DELETE FROM public.team_contributions
  WHERE team_id = p_team_id AND user_id = v_user_id;

  DELETE FROM public.team_members
  WHERE team_id = p_team_id AND user_id = v_user_id;
END;
$$;


-- 4. delete_team
CREATE OR REPLACE FUNCTION public.delete_team(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_is_owner boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = p_team_id AND owner_id = v_user_id
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  DELETE FROM public.teams
  WHERE id = p_team_id;
END;
$$;


-- 5. remove_member
CREATE OR REPLACE FUNCTION public.remove_member(p_team_id uuid, p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_is_owner boolean;
  v_target_user_id uuid;
  v_target_role text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = p_team_id AND owner_id = v_user_id
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT user_id, role INTO v_target_user_id, v_target_role
  FROM public.team_members
  WHERE team_id = p_team_id AND member_id = p_member_id;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_target_user_id = v_user_id OR v_target_role = 'owner' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  DELETE FROM public.team_contributions
  WHERE team_id = p_team_id AND user_id = v_target_user_id;

  DELETE FROM public.team_members
  WHERE team_id = p_team_id AND member_id = p_member_id;
END;
$$;


-- 6. rotate_code
CREATE OR REPLACE FUNCTION public.rotate_code(p_team_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_is_owner boolean;
  v_new_code text;
  v_retries integer := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = p_team_id AND owner_id = v_user_id
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  LOOP
    v_new_code := public.internal_generate_join_code();
    BEGIN
      UPDATE public.teams
      SET join_code = v_new_code
      WHERE id = p_team_id;

      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_retries := v_retries + 1;
      IF v_retries > 10 THEN
        RAISE EXCEPTION 'UNKNOWN';
      END IF;
    END;
  END LOOP;

  RETURN v_new_code;
END;
$$;


-- 7. update_my_membership
CREATE OR REPLACE FUNCTION public.update_my_membership(
  p_team_id uuid,
  p_alias text,
  p_sharing boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_old_sharing boolean;
  v_trimmed_alias text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  v_trimmed_alias := trim(p_alias);

  IF char_length(v_trimmed_alias) < 1 OR char_length(v_trimmed_alias) > 30 OR v_trimmed_alias ~ '@' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  SELECT sharing INTO v_old_sharing
  FROM public.team_members
  WHERE team_id = p_team_id AND user_id = v_user_id;

  IF v_old_sharing IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  -- Check alias collision
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND lower(alias) = lower(v_trimmed_alias) AND user_id != v_user_id
  ) THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  -- If turning sharing OFF, delete existing contributions
  IF v_old_sharing = true AND p_sharing = false THEN
    DELETE FROM public.team_contributions
    WHERE team_id = p_team_id AND user_id = v_user_id;
  END IF;

  UPDATE public.team_members
  SET alias = v_trimmed_alias, sharing = p_sharing
  WHERE team_id = p_team_id AND user_id = v_user_id;
END;
$$;


-- 8. update_team_settings
CREATE OR REPLACE FUNCTION public.update_team_settings(
  p_team_id uuid,
  p_show_leaderboard boolean,
  p_target_resource text,
  p_target_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_is_owner boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = p_team_id AND owner_id = v_user_id
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF (p_target_resource IS NOT NULL AND p_target_amount IS NULL) OR
     (p_target_resource IS NULL AND p_target_amount IS NOT NULL) OR
     (p_target_resource IS NOT NULL AND p_target_resource NOT IN ('water', 'energy')) OR
     (p_target_amount IS NOT NULL AND p_target_amount <= 0) THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  UPDATE public.teams
  SET show_leaderboard = p_show_leaderboard,
      target_resource = p_target_resource,
      target_amount = p_target_amount
  WHERE id = p_team_id;
END;
$$;


-- 9. upsert_my_contributions
CREATE OR REPLACE FUNCTION public.upsert_my_contributions(
  p_team_id uuid,
  p_rows jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_sharing boolean;
  v_row jsonb;
  v_day date;
  v_water numeric;
  v_energy numeric;
  v_min_day date;
  v_max_day date;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT sharing INTO v_sharing
  FROM public.team_members
  WHERE team_id = p_team_id AND user_id = v_user_id;

  IF v_sharing IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_sharing = false THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF jsonb_array_length(p_rows) > 40 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  v_min_day := CURRENT_DATE - 31;
  v_max_day := CURRENT_DATE + 1;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_day := (v_row->>'day')::date;
    v_water := (v_row->>'water_saved_l')::numeric;
    v_energy := (v_row->>'energy_saved_kwh')::numeric;

    IF v_day IS NULL OR v_water IS NULL OR v_energy IS NULL THEN
      RAISE EXCEPTION 'VALIDATION';
    END IF;

    IF v_day < v_min_day OR v_day > v_max_day THEN
      RAISE EXCEPTION 'VALIDATION';
    END IF;

    IF abs(v_water) > 10000 OR abs(v_energy) > 1000 THEN
      RAISE EXCEPTION 'VALIDATION';
    END IF;

    INSERT INTO public.team_contributions (team_id, user_id, day, water_saved_l, energy_saved_kwh)
    VALUES (p_team_id, v_user_id, v_day, v_water, v_energy)
    ON CONFLICT (team_id, user_id, day) DO UPDATE
    SET water_saved_l = EXCLUDED.water_saved_l,
        energy_saved_kwh = EXCLUDED.energy_saved_kwh,
        updated_at = now();
  END LOOP;
END;
$$;


-- 10. get_my_teams
CREATE OR REPLACE FUNCTION public.get_my_teams()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_res jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'role', tm.role,
      'alias', tm.alias,
      'sharing', tm.sharing,
      'member_count', (SELECT count(*) FROM public.team_members WHERE team_id = t.id),
      'target_resource', t.target_resource,
      'target_amount', t.target_amount,
      'show_leaderboard', t.show_leaderboard,
      'created_at', t.created_at,
      'join_code', CASE WHEN tm.role = 'owner' THEN t.join_code ELSE NULL END
    ) ORDER BY t.created_at DESC
  ), '[]'::jsonb) INTO v_res
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.user_id = v_user_id;

  RETURN v_res;
END;
$$;


-- 11. get_team_members
CREATE OR REPLACE FUNCTION public.get_team_members(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_is_member boolean;
  v_res jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = v_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'member_id', member_id,
      'alias', alias,
      'role', role,
      'sharing', sharing,
      'joined_at', joined_at
    ) ORDER BY joined_at ASC
  ), '[]'::jsonb) INTO v_res
  FROM public.team_members
  WHERE team_id = p_team_id;

  RETURN v_res;
END;
$$;


-- 12. get_team_summary
CREATE OR REPLACE FUNCTION public.get_team_summary(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_is_member boolean;
  v_member_count integer;
  v_sharing_count integer;
  v_visible boolean;
  v_total_water numeric := NULL;
  v_total_energy numeric := NULL;
  v_target_progress numeric := NULL;
  v_team record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = v_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT * INTO v_team FROM public.teams WHERE id = p_team_id;

  SELECT count(*) INTO v_member_count
  FROM public.team_members WHERE team_id = p_team_id;

  SELECT count(*) INTO v_sharing_count
  FROM public.team_members WHERE team_id = p_team_id AND sharing = true;

  v_visible := (v_sharing_count >= 3);

  IF v_visible THEN
    SELECT
      coalesce(sum(tc.water_saved_l), 0),
      coalesce(sum(tc.energy_saved_kwh), 0)
    INTO v_total_water, v_total_energy
    FROM public.team_contributions tc
    JOIN public.team_members tm ON tm.team_id = tc.team_id AND tm.user_id = tc.user_id
    WHERE tc.team_id = p_team_id
      AND tm.sharing = true
      AND tc.day >= CURRENT_DATE - 29
      AND tc.day <= CURRENT_DATE;

    IF v_team.target_resource = 'water' AND v_team.target_amount > 0 THEN
      v_target_progress := v_total_water / v_team.target_amount;
    ELSIF v_team.target_resource = 'energy' AND v_team.target_amount > 0 THEN
      v_target_progress := v_total_energy / v_team.target_amount;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'member_count', v_member_count,
    'sharing_count', v_sharing_count,
    'visible', v_visible,
    'days_window', 30,
    'total_water_saved_l', v_total_water,
    'total_energy_saved_kwh', v_total_energy,
    'target_resource', v_team.target_resource,
    'target_amount', v_team.target_amount,
    'target_progress', v_target_progress
  );
END;
$$;


-- 13. get_leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_is_member boolean;
  v_show_leaderboard boolean;
  v_qualifying_members integer;
  v_res jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = v_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT show_leaderboard INTO v_show_leaderboard
  FROM public.teams WHERE id = p_team_id;

  IF NOT v_show_leaderboard THEN
    RETURN '[]'::jsonb;
  END IF;

  -- k-anonymity: at least 3 sharing members each with at least 3 contribution days in window
  SELECT count(*) INTO v_qualifying_members
  FROM (
    SELECT tc.user_id
    FROM public.team_contributions tc
    JOIN public.team_members tm ON tm.team_id = tc.team_id AND tm.user_id = tc.user_id
    WHERE tc.team_id = p_team_id
      AND tm.sharing = true
      AND tc.day >= CURRENT_DATE - 29
      AND tc.day <= CURRENT_DATE
    GROUP BY tc.user_id
    HAVING count(DISTINCT tc.day) >= 3
  ) sub;

  IF v_qualifying_members < 3 THEN
    RETURN '[]'::jsonb;
  END IF;

  WITH member_stats AS (
    SELECT
      tm.user_id,
      tm.alias,
      count(DISTINCT tc.day) AS days_counted,
      greatest(0, round((sum(tc.water_saved_l) / (tm.baseline_water_l_day * count(DISTINCT tc.day))) * 100)) AS pct_water,
      greatest(0, round((sum(tc.energy_saved_kwh) / (tm.baseline_energy_kwh_day * count(DISTINCT tc.day))) * 100)) AS pct_energy
    FROM public.team_members tm
    JOIN public.team_contributions tc ON tc.team_id = tm.team_id AND tc.user_id = tm.user_id
    WHERE tm.team_id = p_team_id
      AND tm.sharing = true
      AND tc.day >= CURRENT_DATE - 29
      AND tc.day <= CURRENT_DATE
    GROUP BY tm.user_id, tm.alias, tm.baseline_water_l_day, tm.baseline_energy_kwh_day
    HAVING count(DISTINCT tc.day) >= 3
  ),
  ranked AS (
    SELECT
      user_id,
      alias,
      days_counted,
      pct_water,
      pct_energy,
      round((pct_water + pct_energy) / 2.0) AS pct_overall,
      dense_rank() OVER (
        ORDER BY round((pct_water + pct_energy) / 2.0) DESC, pct_water DESC, pct_energy DESC
      ) AS rank
    FROM member_stats
  ),
  top10 AS (
    SELECT * FROM ranked WHERE rank <= 10
    UNION
    SELECT * FROM ranked WHERE user_id = v_user_id
  )
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'rank', rank,
      'alias', alias,
      'pct_water', pct_water,
      'pct_energy', pct_energy,
      'pct_overall', pct_overall,
      'days_counted', days_counted,
      'is_me', (user_id = v_user_id)
    ) ORDER BY rank ASC, alias ASC
  ), '[]'::jsonb) INTO v_res
  FROM top10;

  RETURN v_res;
END;
$$;

-- Grant RPC execution permissions to authenticated role ONLY
REVOKE EXECUTE ON FUNCTION public.internal_generate_join_code FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_team FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.join_team FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.leave_team FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_team FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_member FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rotate_code FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_my_membership FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_team_settings FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_my_contributions FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_teams FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_team_members FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_team_summary FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_team TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_team TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_team TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_team TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_membership TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_team_settings TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_my_contributions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_teams TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_members TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard TO authenticated;
