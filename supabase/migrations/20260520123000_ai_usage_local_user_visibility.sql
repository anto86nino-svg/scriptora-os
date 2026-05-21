-- Keep the internal AI usage dashboard able to read legacy local usage rows.
-- Older Edge Functions logged "local-user"; newer tracked calls use local-user-*.

DROP POLICY IF EXISTS "Local dev access to ai_usage_logs" ON public.ai_usage_logs;

CREATE POLICY "Local dev access to ai_usage_logs"
  ON public.ai_usage_logs FOR SELECT
  TO anon
  USING (
    user_id = 'local-user'
    OR user_id LIKE 'local-user-%'
    OR user_id = 'public-user'
  );
