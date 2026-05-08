-- ============================================================
-- PLANOS: Verification & Testing Queries
-- Use these queries to verify your setup is correct
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. VERIFY RLS IS ENABLED
-- ────────────────────────────────────────────────────────────

-- Check if RLS is enabled on payments and profiles tables
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('payments', 'profiles')
ORDER BY tablename;

-- Expected output:
-- schemaname | tablename | rls_enabled
-- -----------+-----------+-------------
-- public     | payments  | true
-- public     | profiles  | true


-- ────────────────────────────────────────────────────────────
-- 2. VERIFY ALL POLICIES EXIST
-- ────────────────────────────────────────────────────────────

-- List all policies for payments and profiles tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd AS command,
    qual AS using_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('payments', 'profiles')
ORDER BY tablename, policyname;

-- Expected policies:
-- PAYMENTS:
--   • Admin god mode: SELECT payments
--   • Admin god mode: UPDATE payments
--   • Users can view own payments
--   • Users can insert own payments
--
-- PROFILES:
--   • Admin god mode: SELECT profiles
--   • Admin god mode: UPDATE profiles
--   • Users can view own profile
--   • Users can update own profile
--   • Users can insert own profile


-- ────────────────────────────────────────────────────────────
-- 3. VERIFY TABLE STRUCTURE
-- ────────────────────────────────────────────────────────────

-- Check payments table columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'payments'
ORDER BY ordinal_position;

-- Check profiles table has tier and unlocked_themes columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('tier', 'unlocked_themes')
ORDER BY column_name;

-- Expected output for profiles:
-- column_name      | data_type      | is_nullable | column_default
-- -----------------+----------------+-------------+----------------
-- tier             | text           | YES         | 'Free'::text
-- unlocked_themes  | ARRAY          | YES         | ARRAY['Default']


-- ────────────────────────────────────────────────────────────
-- 4. VERIFY STORAGE POLICIES
-- ────────────────────────────────────────────────────────────

-- Check storage bucket exists
SELECT 
    id,
    name,
    public
FROM storage.buckets
WHERE id = 'payment-receipts';

-- Expected output:
-- id                | name              | public
-- ------------------+-------------------+--------
-- payment-receipts  | payment-receipts  | true

-- Check storage policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd AS command
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%receipt%'
ORDER BY policyname;

-- Expected policies:
--   • Admin can view all receipts
--   • Users can upload own receipts
--   • Users can view own receipts


-- ────────────────────────────────────────────────────────────
-- 5. TEST DATA QUERIES (for debugging)
-- ────────────────────────────────────────────────────────────

-- View all pending payments (run as admin)
SELECT 
    id,
    username,
    email,
    tier,
    amount,
    transaction_id,
    status,
    created_at
FROM public.payments
WHERE status = 'pending'
ORDER BY created_at DESC;

-- View all approved payments (run as admin)
SELECT 
    id,
    username,
    email,
    tier,
    amount,
    status,
    reviewed_at,
    reviewed_by
FROM public.payments
WHERE status = 'approved'
ORDER BY reviewed_at DESC;

-- View user profiles with tier info (run as admin)
SELECT 
    id,
    username,
    tier,
    unlocked_themes,
    created_at
FROM public.profiles
WHERE tier != 'Free'
ORDER BY created_at DESC;

-- Count payments by status
SELECT 
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM public.payments
GROUP BY status
ORDER BY status;


-- ────────────────────────────────────────────────────────────
-- 6. VERIFY INDEXES
-- ────────────────────────────────────────────────────────────

-- Check indexes on payments table
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'payments'
ORDER BY indexname;

-- Expected indexes:
--   • payments_pkey (PRIMARY KEY on id)
--   • idx_payments_user_id
--   • idx_payments_status
--   • idx_payments_created_at


-- ────────────────────────────────────────────────────────────
-- 7. VERIFY TRIGGERS
-- ────────────────────────────────────────────────────────────

-- Check triggers on payments table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'payments'
ORDER BY trigger_name;

-- Expected trigger:
--   • update_payments_updated_at (BEFORE UPDATE)


-- ────────────────────────────────────────────────────────────
-- 8. TEST ADMIN ACCESS (run as PlanosPlanMaker@gmail.com)
-- ────────────────────────────────────────────────────────────

-- This should return ALL payments (not just your own)
SELECT COUNT(*) as total_payments FROM public.payments;

-- This should return ALL profiles (not just your own)
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- If you see all records, admin access is working ✅


-- ────────────────────────────────────────────────────────────
-- 9. TEST USER ACCESS (run as regular user)
-- ────────────────────────────────────────────────────────────

-- This should return ONLY your payments
SELECT * FROM public.payments;

-- This should return ONLY your profile
SELECT * FROM public.profiles;

-- If you only see your own records, user isolation is working ✅


-- ────────────────────────────────────────────────────────────
-- 10. CLEANUP QUERIES (use with caution!)
-- ────────────────────────────────────────────────────────────

-- Delete all test payments (run as admin)
-- DELETE FROM public.payments WHERE transaction_id LIKE 'TEST%';

-- Reset a user's tier to Free (run as admin)
-- UPDATE public.profiles 
-- SET tier = 'Free', unlocked_themes = ARRAY['Default']
-- WHERE email = 'test@example.com';

-- Delete rejected payments older than 30 days (run as admin)
-- DELETE FROM public.payments 
-- WHERE status = 'rejected' 
-- AND created_at < NOW() - INTERVAL '30 days';


-- ────────────────────────────────────────────────────────────
-- 11. PERFORMANCE MONITORING
-- ────────────────────────────────────────────────────────────

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('payments', 'profiles')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check most recent payments
SELECT 
    username,
    tier,
    amount,
    status,
    created_at,
    AGE(NOW(), created_at) as time_since_submission
FROM public.payments
ORDER BY created_at DESC
LIMIT 10;


-- ────────────────────────────────────────────────────────────
-- 12. TROUBLESHOOTING QUERIES
-- ────────────────────────────────────────────────────────────

-- Find payments without matching profiles (orphaned records)
SELECT p.*
FROM public.payments p
LEFT JOIN public.profiles pr ON p.user_id = pr.id
WHERE pr.id IS NULL;

-- Find profiles without tier column (if migration failed)
SELECT 
    table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name NOT IN ('tier', 'unlocked_themes');

-- Check for duplicate transaction IDs
SELECT 
    transaction_id,
    COUNT(*) as count
FROM public.payments
GROUP BY transaction_id
HAVING COUNT(*) > 1;

-- Find pending payments older than 24 hours
SELECT 
    id,
    username,
    email,
    tier,
    created_at,
    AGE(NOW(), created_at) as pending_duration
FROM public.payments
WHERE status = 'pending'
AND created_at < NOW() - INTERVAL '24 hours'
ORDER BY created_at ASC;


-- ────────────────────────────────────────────────────────────
-- 13. SECURITY AUDIT
-- ────────────────────────────────────────────────────────────

-- Verify no public access to sensitive tables
SELECT 
    schemaname,
    tablename,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN ('payments', 'profiles')
AND grantee = 'PUBLIC';

-- Expected: No rows (PUBLIC should not have direct access)

-- Check who can access payments table
SELECT 
    schemaname,
    tablename,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'payments'
ORDER BY grantee, privilege_type;


-- ────────────────────────────────────────────────────────────
-- 14. QUICK HEALTH CHECK (run this first!)
-- ────────────────────────────────────────────────────────────

-- One query to check everything
SELECT 
    'RLS Enabled' as check_name,
    CASE WHEN COUNT(*) = 2 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('payments', 'profiles')
AND rowsecurity = true

UNION ALL

SELECT 
    'Policies Exist' as check_name,
    CASE WHEN COUNT(*) >= 9 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('payments', 'profiles')

UNION ALL

SELECT 
    'Storage Bucket Exists' as check_name,
    CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM storage.buckets
WHERE id = 'payment-receipts'

UNION ALL

SELECT 
    'Tier Column Exists' as check_name,
    CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name = 'tier'

UNION ALL

SELECT 
    'Unlocked Themes Column Exists' as check_name,
    CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name = 'unlocked_themes';

-- Expected output: All checks should show ✅ PASS


-- ============================================================
-- END OF VERIFICATION QUERIES
-- ============================================================

-- 💡 TIP: Run the "Quick Health Check" query first to verify
--         your setup is complete. If all checks pass, you're
--         ready to test the payment flow!
