
-- 1) Drop tangible_assets columns
ALTER TABLE tangible_assets DROP COLUMN IF EXISTS user_name;
ALTER TABLE tangible_assets DROP COLUMN IF EXISTS manager_name;

-- 2) Create business_projects table
CREATE TABLE IF NOT EXISTS business_projects (
  id bigint generated always as identity primary key,
  project_code text unique,
  project_name text not null,
  department_code text references departments(department_code),
  project_status text not null,
  order_date date,
  start_date date,
  end_date date,
  sales_amount numeric(18,2) default 0,
  purchase_amount numeric(18,2) default 0,
  net_sales_amount numeric(18,2) default 0,
  client_name text,
  note text,
  updated_at timestamptz not null default now(),
  last_modified_by_account_id text
);

-- Validation trigger for project_status (use trigger instead of CHECK)
CREATE OR REPLACE FUNCTION public.validate_project_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
begin
  if new.project_status not in ('영업 전', '영업중', '수주완료', '프로젝트 완료', '기타') then
    raise exception 'Invalid project_status: %', new.project_status;
  end if;
  return new;
end;
$function$;

CREATE TRIGGER trg_validate_project_status
BEFORE INSERT OR UPDATE ON business_projects
FOR EACH ROW EXECUTE FUNCTION validate_project_status();

CREATE TRIGGER trg_business_projects_updated_at
BEFORE UPDATE ON business_projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_business_projects_department_code ON business_projects(department_code);
CREATE INDEX IF NOT EXISTS idx_business_projects_project_status ON business_projects(project_status);
CREATE INDEX IF NOT EXISTS idx_business_projects_order_date ON business_projects(order_date);

-- RLS
ALTER TABLE business_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_business_projects" ON business_projects FOR SELECT USING (true);
CREATE POLICY "auth_insert_business_projects" ON business_projects FOR INSERT WITH CHECK (true);
CREATE POLICY "auth_update_business_projects" ON business_projects FOR UPDATE USING (true);
CREATE POLICY "auth_delete_business_projects" ON business_projects FOR DELETE USING (true);

-- 3) Add columns to department_sales_summary
ALTER TABLE department_sales_summary
ADD COLUMN IF NOT EXISTS cumulative_sales_amount numeric(18,2) default 0,
ADD COLUMN IF NOT EXISTS cumulative_purchase_amount numeric(18,2) default 0,
ADD COLUMN IF NOT EXISTS cumulative_net_sales_amount numeric(18,2) default 0,
ADD COLUMN IF NOT EXISTS cumulative_qoq numeric(10,4) default 0,
ADD COLUMN IF NOT EXISTS active_project_count integer default 0,
ADD COLUMN IF NOT EXISTS monthly_order_project_count integer default 0;
