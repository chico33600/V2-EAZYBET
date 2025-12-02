/*
  # Document Leaked Password Protection Requirement

  1. Security Requirement
    - Leaked Password Protection should be enabled via Supabase Dashboard
    - This checks passwords against HaveIBeenPwned.org database
    - Protects users from using compromised passwords
  
  2. Manual Configuration Required
    - This setting cannot be configured via SQL migrations
    - Must be enabled through Supabase Dashboard or Management API
    - Steps to enable:
      a. Go to Supabase Dashboard
      b. Navigate to Authentication > Settings > Security
      c. Enable "Leaked Password Protection"
      d. Save changes
  
  3. Benefits
    - Prevents credential stuffing attacks
    - Protects user accounts from known breached passwords
    - Industry best practice for authentication security
*/

-- Log notification about manual configuration requirement
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'SECURITY CONFIGURATION REQUIRED';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Leaked Password Protection must be enabled manually via Supabase Dashboard:';
  RAISE NOTICE '1. Navigate to Authentication > Settings > Security';
  RAISE NOTICE '2. Enable "Leaked Password Protection"';
  RAISE NOTICE '3. This feature checks passwords against HaveIBeenPwned.org';
  RAISE NOTICE '4. Save your changes';
  RAISE NOTICE '==========================================';
END $$;
