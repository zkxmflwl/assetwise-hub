
-- Drop the restrictive SELECT policy and recreate as permissive
DROP POLICY IF EXISTS "auth_select_dash_users" ON public.dash_users;

CREATE POLICY "auth_select_dash_users"
ON public.dash_users
FOR SELECT
TO authenticated
USING (true);
