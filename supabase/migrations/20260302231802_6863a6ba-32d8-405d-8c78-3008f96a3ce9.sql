
-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "auth_update_own_dash_users" ON public.dash_users;

CREATE POLICY "auth_update_own_dash_users"
ON public.dash_users
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());
