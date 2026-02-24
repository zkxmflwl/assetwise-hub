
-- ============================================
-- 1. 기존 데이터 정리 (FK 의존성 순서)
-- ============================================
DELETE FROM public.department_sales_summary;
DELETE FROM public.intangible_assets;
DELETE FROM public.tangible_assets;
DELETE FROM public.dash_users;

-- ============================================
-- 2. 감사 컬럼 변경: last_modified_by_user_id → last_modified_by_auth_user_id (uuid)
-- ============================================
-- tangible_assets
ALTER TABLE public.tangible_assets DROP CONSTRAINT IF EXISTS tangible_assets_last_modified_by_user_id_fkey;
ALTER TABLE public.tangible_assets DROP COLUMN IF EXISTS last_modified_by_user_id;
ALTER TABLE public.tangible_assets ADD COLUMN last_modified_by_auth_user_id uuid;

-- intangible_assets
ALTER TABLE public.intangible_assets DROP CONSTRAINT IF EXISTS intangible_assets_last_modified_by_user_id_fkey;
ALTER TABLE public.intangible_assets DROP COLUMN IF EXISTS last_modified_by_user_id;
ALTER TABLE public.intangible_assets ADD COLUMN last_modified_by_auth_user_id uuid;

-- department_sales_summary
ALTER TABLE public.department_sales_summary DROP CONSTRAINT IF EXISTS department_sales_summary_last_modified_by_user_id_fkey;
ALTER TABLE public.department_sales_summary DROP COLUMN IF EXISTS last_modified_by_user_id;
ALTER TABLE public.department_sales_summary ADD COLUMN last_modified_by_auth_user_id uuid;

-- ============================================
-- 3. dash_users 구조 변경
-- ============================================
ALTER TABLE public.dash_users DROP CONSTRAINT IF EXISTS dash_users_pkey;
ALTER TABLE public.dash_users DROP CONSTRAINT IF EXISTS dash_users_department_code_fkey;
ALTER TABLE public.dash_users DROP COLUMN IF EXISTS user_id;

ALTER TABLE public.dash_users ADD COLUMN auth_user_id uuid NOT NULL UNIQUE;
ALTER TABLE public.dash_users ADD COLUMN user_email text NOT NULL;
ALTER TABLE public.dash_users ADD COLUMN must_change_password boolean NOT NULL DEFAULT true;

ALTER TABLE public.dash_users ADD CONSTRAINT dash_users_pkey PRIMARY KEY (auth_user_id);
ALTER TABLE public.dash_users ADD CONSTRAINT dash_users_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.dash_users ADD CONSTRAINT dash_users_department_code_fkey FOREIGN KEY (department_code) REFERENCES public.departments(department_code);
ALTER TABLE public.dash_users ALTER COLUMN role_code SET DEFAULT 'VIEWER';

-- ============================================
-- 4. 감사 컬럼 FK 추가 (dash_users 재구성 후)
-- ============================================
ALTER TABLE public.tangible_assets ADD CONSTRAINT tangible_assets_last_modified_by_auth_user_id_fkey
  FOREIGN KEY (last_modified_by_auth_user_id) REFERENCES public.dash_users(auth_user_id);

ALTER TABLE public.intangible_assets ADD CONSTRAINT intangible_assets_last_modified_by_auth_user_id_fkey
  FOREIGN KEY (last_modified_by_auth_user_id) REFERENCES public.dash_users(auth_user_id);

ALTER TABLE public.department_sales_summary ADD CONSTRAINT department_sales_summary_last_modified_by_auth_user_id_fkey
  FOREIGN KEY (last_modified_by_auth_user_id) REFERENCES public.dash_users(auth_user_id);

-- ============================================
-- 5. RLS 정책: anon → authenticated 전환
-- ============================================
-- dash_users
DROP POLICY IF EXISTS "Allow anon select" ON public.dash_users;
CREATE POLICY "auth_select_dash_users" ON public.dash_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_update_own_dash_users" ON public.dash_users FOR UPDATE TO authenticated USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

-- tangible_assets
DROP POLICY IF EXISTS "Allow anon select" ON public.tangible_assets;
DROP POLICY IF EXISTS "Allow anon insert tangible_assets" ON public.tangible_assets;
DROP POLICY IF EXISTS "Allow anon update tangible_assets" ON public.tangible_assets;
DROP POLICY IF EXISTS "Allow anon delete tangible_assets" ON public.tangible_assets;
CREATE POLICY "auth_select_tangible" ON public.tangible_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_tangible" ON public.tangible_assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_tangible" ON public.tangible_assets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_tangible" ON public.tangible_assets FOR DELETE TO authenticated USING (true);

-- intangible_assets
DROP POLICY IF EXISTS "Allow anon select" ON public.intangible_assets;
DROP POLICY IF EXISTS "Allow anon insert intangible_assets" ON public.intangible_assets;
DROP POLICY IF EXISTS "Allow anon update intangible_assets" ON public.intangible_assets;
DROP POLICY IF EXISTS "Allow anon delete intangible_assets" ON public.intangible_assets;
CREATE POLICY "auth_select_intangible" ON public.intangible_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_intangible" ON public.intangible_assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_intangible" ON public.intangible_assets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_intangible" ON public.intangible_assets FOR DELETE TO authenticated USING (true);

-- departments
DROP POLICY IF EXISTS "Allow anon select" ON public.departments;
CREATE POLICY "auth_select_departments" ON public.departments FOR SELECT TO authenticated USING (true);

-- asset_types
DROP POLICY IF EXISTS "Allow anon select" ON public.asset_types;
CREATE POLICY "auth_select_asset_types" ON public.asset_types FOR SELECT TO authenticated USING (true);

-- department_sales_summary
DROP POLICY IF EXISTS "Allow anon select" ON public.department_sales_summary;
CREATE POLICY "auth_select_dept_sales" ON public.department_sales_summary FOR SELECT TO authenticated USING (true);

-- ============================================
-- 6. updated_at 트리거 추가
-- ============================================
DROP TRIGGER IF EXISTS set_dash_users_updated_at ON public.dash_users;
CREATE TRIGGER set_dash_users_updated_at BEFORE UPDATE ON public.dash_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_tangible_assets_updated_at ON public.tangible_assets;
CREATE TRIGGER set_tangible_assets_updated_at BEFORE UPDATE ON public.tangible_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_intangible_assets_updated_at ON public.intangible_assets;
CREATE TRIGGER set_intangible_assets_updated_at BEFORE UPDATE ON public.intangible_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_dept_sales_updated_at ON public.department_sales_summary;
CREATE TRIGGER set_dept_sales_updated_at BEFORE UPDATE ON public.department_sales_summary FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
