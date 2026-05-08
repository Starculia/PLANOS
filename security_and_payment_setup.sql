-- ============================================================
-- PLANOS: Database Security & Payment System Setup
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CREATE PAYMENTS TABLE (if not exists)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('Pro', 'Elite')),
  amount INTEGER NOT NULL,
  transaction_id TEXT NOT NULL,
  receipt_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 2. ADD TIER & UNLOCKED_THEMES TO PROFILES (if not exists)
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'tier'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN tier TEXT DEFAULT 'Free';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'unlocked_themes'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN unlocked_themes TEXT[] DEFAULT ARRAY['Default'];
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 3. ENABLE ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 4. DROP ALL EXISTING POLICIES (clean slate to avoid conflicts)
-- ────────────────────────────────────────────────────────────

-- payments
DROP POLICY IF EXISTS "Admin god mode: SELECT payments"   ON public.payments;
DROP POLICY IF EXISTS "Admin god mode: UPDATE payments"   ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments"       ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments"     ON public.payments;

-- profiles (including the old ones from supabase.sql)
DROP POLICY IF EXISTS "Admin god mode: SELECT profiles"   ON public.profiles;
DROP POLICY IF EXISTS "Admin god mode: UPDATE profiles"   ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"        ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"      ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"      ON public.profiles;

-- ────────────────────────────────────────────────────────────
-- 5. PROFILES POLICIES
-- ────────────────────────────────────────────────────────────

-- Admin: SELECT all profiles
CREATE POLICY "Admin god mode: SELECT profiles" ON public.profiles
  FOR SELECT
  USING (
    (auth.jwt() ->> 'email') = 'PlanosPlanMaker@gmail.com'
    OR auth.uid() = id
  );

-- Admin: UPDATE all profiles (this is the critical one — allows tier upgrade)
-- Uses a SECURITY DEFINER function so the admin can bypass the uid check
CREATE POLICY "Admin god mode: UPDATE profiles" ON public.profiles
  FOR UPDATE
  USING (
    (auth.jwt() ->> 'email') = 'PlanosPlanMaker@gmail.com'
    OR auth.uid() = id
  );

-- Regular users: INSERT their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- 6. PAYMENTS POLICIES
-- ────────────────────────────────────────────────────────────

-- Admin: SELECT all payments
CREATE POLICY "Admin god mode: SELECT payments" ON public.payments
  FOR SELECT
  USING (
    (auth.jwt() ->> 'email') = 'PlanosPlanMaker@gmail.com'
    OR auth.uid() = user_id
  );

-- Admin: UPDATE all payments
CREATE POLICY "Admin god mode: UPDATE payments" ON public.payments
  FOR UPDATE
  USING (
    (auth.jwt() ->> 'email') = 'PlanosPlanMaker@gmail.com'
  );

-- Regular users: INSERT their own payment
CREATE POLICY "Users can insert own payments" ON public.payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 7. STORAGE POLICIES (payment-receipts bucket)
--    NOTE: "CREATE POLICY IF NOT EXISTS" is NOT valid syntax.
--    We use DROP first, then CREATE.
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can upload own receipts"  ON storage.objects;
DROP POLICY IF EXISTS "Admin can view all receipts"    ON storage.objects;
DROP POLICY IF EXISTS "Users can view own receipts"    ON storage.objects;

-- Users upload their own receipts (path must start with their user_id)
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admin can view ALL receipts
CREATE POLICY "Admin can view all receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (auth.jwt() ->> 'email') = 'PlanosPlanMaker@gmail.com'
);

-- Users can view their own receipts
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ────────────────────────────────────────────────────────────
-- 8. UPDATED_AT TRIGGER FOR PAYMENTS
-- ────────────────────────────────────────────────────────────

-- Add updated_at column if it doesn't exist
-- (the trigger will crash without it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'payments'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.payments
      ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 9. ENABLE REALTIME ON PAYMENTS AND PROFILES TABLES
--    This is required for the user's browser to receive the
--    approval notification and auto-upgrade their tier.
-- ────────────────────────────────────────────────────────────

-- Add payments to the supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
END $$;

-- Add profiles to the supabase_realtime publication
-- (needed so the user's browser detects the tier change immediately)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 10. VERIFY YOUR SETUP (run these SELECT queries after)
-- ────────────────────────────────────────────────────────────

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename IN ('payments','profiles');

-- Check policies exist:
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public' AND tablename IN ('payments','profiles')
-- ORDER BY tablename, policyname;

-- Check realtime is enabled:
-- SELECT tablename FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime';
