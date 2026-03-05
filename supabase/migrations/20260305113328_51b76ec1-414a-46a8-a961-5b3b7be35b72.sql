
-- ============================================
-- [SQL 1] department_sales_summary 수정
-- ============================================

alter table public.department_sales_summary
  drop constraint if exists department_sales_summary_department_code_month_key_key;

alter table public.department_sales_summary
  drop constraint if exists department_sales_summary_month_key_check;

alter table public.department_sales_summary
  drop constraint if exists department_sales_summary_total_headcount_check;

drop index if exists public.idx_department_sales_summary_month_key;

alter table public.department_sales_summary
  drop column if exists net_sales_amount;

alter table public.department_sales_summary
  add column if not exists total_headcount integer not null default 0;

alter table public.department_sales_summary
  add column if not exists headcount_note text null;

alter table public.department_sales_summary
  add constraint department_sales_summary_department_code_month_key_key
  unique (department_code, month_key);

alter table public.department_sales_summary
  add constraint department_sales_summary_month_key_check
  check ((month_key ~ '^\d{4}-\d{2}$'));

alter table public.department_sales_summary
  add constraint department_sales_summary_total_headcount_check
  check ((total_headcount >= 0));

create index if not exists idx_department_sales_summary_month_key
  on public.department_sales_summary using btree (month_key);

drop trigger if exists trg_department_sales_summary_updated_at on public.department_sales_summary;

create trigger trg_department_sales_summary_updated_at
before update on public.department_sales_summary
for each row
execute function public.set_updated_at();

-- ============================================
-- [SQL 2] 기존 business_projects 삭제 후 재생성
-- ============================================

drop trigger if exists trg_business_projects_updated_at on public.business_projects;

drop table if exists public.business_projects cascade;

create table public.business_projects (
  id bigint generated always as identity not null,
  project_name text not null,
  project_summary text null,
  department_code text not null,
  client_name text null,
  project_status text not null,
  schedule_note text null,
  category text null,
  base_date date null,
  order_date date null,
  start_date date null,
  end_date date null,
  sales_amount numeric(18,2) not null default 0,
  purchase_amount numeric(18,2) not null default 0,
  note text null,
  effort text null,
  last_modified_by_auth_user_id uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint business_projects_pkey primary key (id),
  constraint business_projects_department_code_fkey
    foreign key (department_code)
    references public.departments(department_code),
  constraint business_projects_last_modified_by_auth_user_id_fkey
    foreign key (last_modified_by_auth_user_id)
    references public.dash_users(auth_user_id),
  constraint business_projects_project_status_check
    check (
      project_status = any (
        array[
          '영업 전'::text,
          '영업 중'::text,
          '수주 완료'::text,
          '프로젝트 중'::text,
          '프로젝트 완료'::text,
          '기타'::text
        ]
      )
    )
) tablespace pg_default;

create index if not exists idx_business_projects_department_code
  on public.business_projects using btree (department_code);

create index if not exists idx_business_projects_project_status
  on public.business_projects using btree (project_status);

create index if not exists idx_business_projects_base_date
  on public.business_projects using btree (base_date);

create index if not exists idx_business_projects_order_date
  on public.business_projects using btree (order_date);

create index if not exists idx_business_projects_start_date
  on public.business_projects using btree (start_date);

create index if not exists idx_business_projects_end_date
  on public.business_projects using btree (end_date);

drop trigger if exists trg_business_projects_updated_at on public.business_projects;

create trigger trg_business_projects_updated_at
before update on public.business_projects
for each row
execute function public.set_updated_at();

-- Re-enable RLS on business_projects
alter table public.business_projects enable row level security;

create policy "auth_select_business_projects"
on public.business_projects for select to authenticated using (true);

create policy "auth_insert_business_projects"
on public.business_projects for insert to authenticated with check (true);

create policy "auth_update_business_projects"
on public.business_projects for update to authenticated using (true);

create policy "auth_delete_business_projects"
on public.business_projects for delete to authenticated using (true);
