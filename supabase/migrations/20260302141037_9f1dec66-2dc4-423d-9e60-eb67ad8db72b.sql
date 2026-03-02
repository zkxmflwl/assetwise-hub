
-- Add INSERT/UPDATE/DELETE policies for department_sales_summary
CREATE POLICY "auth_insert_dept_sales"
ON public.department_sales_summary
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "auth_update_dept_sales"
ON public.department_sales_summary
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "auth_delete_dept_sales"
ON public.department_sales_summary
FOR DELETE
TO authenticated
USING (true);

-- Add INSERT/UPDATE/DELETE policies for departments
CREATE POLICY "auth_insert_departments"
ON public.departments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "auth_update_departments"
ON public.departments
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "auth_delete_departments"
ON public.departments
FOR DELETE
TO authenticated
USING (true);

-- Make SELECT policies permissive (drop restrictive and recreate)
DROP POLICY IF EXISTS "auth_select_dept_sales" ON public.department_sales_summary;
CREATE POLICY "auth_select_dept_sales"
ON public.department_sales_summary
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "auth_select_departments" ON public.departments;
CREATE POLICY "auth_select_departments"
ON public.departments
FOR SELECT
TO authenticated
USING (true);

-- Also fix dash_users SELECT to be permissive
DROP POLICY IF EXISTS "auth_select_dash_users" ON public.dash_users;
CREATE POLICY "auth_select_dash_users"
ON public.dash_users
FOR SELECT
TO authenticated
USING (true);
