
-- 1. Add sector columns to departments
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS sector_code text,
  ADD COLUMN IF NOT EXISTS sector_name text;

-- 2. Drop and recreate existing foreign keys with ON UPDATE CASCADE ON DELETE NO ACTION

-- business_projects
ALTER TABLE public.business_projects DROP CONSTRAINT IF EXISTS business_projects_department_code_fkey;
ALTER TABLE public.business_projects ADD CONSTRAINT business_projects_department_code_fkey
  FOREIGN KEY (department_code) REFERENCES public.departments(department_code) ON UPDATE CASCADE ON DELETE NO ACTION;

-- department_sales_summary
ALTER TABLE public.department_sales_summary DROP CONSTRAINT IF EXISTS department_sales_summary_department_code_fkey;
ALTER TABLE public.department_sales_summary ADD CONSTRAINT department_sales_summary_department_code_fkey
  FOREIGN KEY (department_code) REFERENCES public.departments(department_code) ON UPDATE CASCADE ON DELETE NO ACTION;

-- dash_users
ALTER TABLE public.dash_users DROP CONSTRAINT IF EXISTS dash_users_department_code_fkey;
ALTER TABLE public.dash_users ADD CONSTRAINT dash_users_department_code_fkey
  FOREIGN KEY (department_code) REFERENCES public.departments(department_code) ON UPDATE CASCADE ON DELETE NO ACTION;

-- intangible_assets
ALTER TABLE public.intangible_assets DROP CONSTRAINT IF EXISTS intangible_assets_department_code_fkey;
ALTER TABLE public.intangible_assets ADD CONSTRAINT intangible_assets_department_code_fkey
  FOREIGN KEY (department_code) REFERENCES public.departments(department_code) ON UPDATE CASCADE ON DELETE NO ACTION;

-- tangible_assets
ALTER TABLE public.tangible_assets DROP CONSTRAINT IF EXISTS tangible_assets_department_code_fkey;
ALTER TABLE public.tangible_assets ADD CONSTRAINT tangible_assets_department_code_fkey
  FOREIGN KEY (department_code) REFERENCES public.departments(department_code) ON UPDATE CASCADE ON DELETE NO ACTION;

-- 3. Create sector_project table
CREATE TABLE public.sector_project (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sector_project_name text NOT NULL,
  sector_code text NOT NULL,
  department_code text NOT NULL REFERENCES public.departments(department_code) ON UPDATE CASCADE ON DELETE NO ACTION,
  user_name text,
  progress integer NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add validation trigger for progress 0-100
CREATE OR REPLACE FUNCTION public.validate_sector_project_progress()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.progress < 0 OR NEW.progress > 100 THEN
    RAISE EXCEPTION 'progress must be between 0 and 100';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_sector_project_progress
  BEFORE INSERT OR UPDATE ON public.sector_project
  FOR EACH ROW EXECUTE FUNCTION public.validate_sector_project_progress();

-- Add updated_at trigger
CREATE TRIGGER trg_sector_project_updated_at
  BEFORE UPDATE ON public.sector_project
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Enable RLS on sector_project
ALTER TABLE public.sector_project ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_sector_project" ON public.sector_project FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sector_project" ON public.sector_project FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sector_project" ON public.sector_project FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_sector_project" ON public.sector_project FOR DELETE TO authenticated USING (true);
