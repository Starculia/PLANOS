-- ============================================================
-- PLANOS — Schema Updates for Pricing / Lootbox / Leaderboard
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Add tier & theme fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Free'
    CHECK (tier IN ('Free', 'Pro', 'Elite')),
  ADD COLUMN IF NOT EXISTS unlocked_themes JSONB DEFAULT '["Default"]'::jsonb;

-- 2. Ensure user_progress has points & level (already exist, but safe to re-confirm)
-- ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
-- ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- 3. Public leaderboard view (joins profiles + user_progress)
--    Safe to expose: only username, level, points, tier — no email/PII
CREATE OR REPLACE VIEW public.global_leaderboard AS
  SELECT
    p.id,
    p.username,
    p.tier,
    COALESCE(up.points, 0)  AS points,
    COALESCE(up.level,  0)  AS level
  FROM public.profiles p
  LEFT JOIN public.user_progress up ON up.user_id = p.id
  ORDER BY up.level DESC NULLS LAST, up.points DESC NULLS LAST;

-- 4. RLS: Allow any authenticated user to read all profiles (for usernames in leaderboard)
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 5. RLS: Allow any authenticated user to read all user_progress (for global leaderboard)
DROP POLICY IF EXISTS "Authenticated users can view all progress" ON public.user_progress;
CREATE POLICY "Authenticated users can view all progress" ON public.user_progress
  FOR SELECT USING (auth.role() = 'authenticated');

-- 6. RLS: Allow service role to update profiles (for webhook upgrades)
--    The Edge Function uses service role key — no extra policy needed for that.
--    But allow users to update their own tier (for client-side UI feedback):
DROP POLICY IF EXISTS "Users can update own tier" ON public.profiles;
CREATE POLICY "Users can update own tier" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 7. Index for leaderboard sorting performance
CREATE INDEX IF NOT EXISTS idx_user_progress_level_points
  ON public.user_progress(level DESC, points DESC);

-- 8. Add order_id tracking for payments (idempotency)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('Pro', 'Elite')),
  status TEXT DEFAULT 'pending',
  amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settled_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- Service role (Edge Function) inserts/updates payments — no anon policy needed.
