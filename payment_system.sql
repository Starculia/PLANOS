-- ============================================================
-- PLANOS — Payment System (QRIS Manual Flow)
-- Append to supabase_updates.sql or run separately
-- ============================================================

-- 1. Drop old payments table if it exists with fewer columns
DROP TABLE IF EXISTS public.payments CASCADE;

-- 2. Full payments table
CREATE TABLE public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT,
    email TEXT,
    tier TEXT NOT NULL CHECK (tier IN ('Pro', 'Elite')),
    amount INTEGER NOT NULL,
    transaction_id TEXT,
    receipt_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT
);

-- 3. RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can insert their own payment
CREATE POLICY "Users can submit payments" ON public.payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view only their own payments
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

-- Service role (admin Edge Function) can do anything
-- No anon policy — handled via service_role in edge function

-- 4. Allow realtime on payments table (so user browser detects approval)
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;

-- 5. Supabase Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT DO NOTHING;

-- Storage policy: authenticated users can upload to their own folder
CREATE POLICY "Users can upload receipts" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'payment-receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policy: only service role can read (for admin panel)
-- Admin reads via service role, no anon read needed
