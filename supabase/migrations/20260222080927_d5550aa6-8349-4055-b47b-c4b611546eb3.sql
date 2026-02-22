
-- 0) 공통: updated_at 자동 갱신용 함수
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 1) 부서 테이블
create table if not exists departments (
  department_code text primary key,
  department_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_departments_updated_at on departments;
create trigger trg_departments_updated_at
before update on departments
for each row execute function set_updated_at();

-- 2) 유저 테이블
create table if not exists dash_users (
  user_id text primary key,
  role_code text not null check (role_code in ('ADMIN', 'MANAGER', 'VIEWER')),
  user_name text not null,
  department_code text references departments(department_code),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_dash_users_updated_at on dash_users;
create trigger trg_dash_users_updated_at
before update on dash_users
for each row execute function set_updated_at();

-- 3) 자산유형 테이블
create table if not exists asset_types (
  asset_type_code text primary key,
  major_category text not null check (major_category in ('유형자산', '무형자산')),
  sub_category text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (major_category, sub_category)
);

drop trigger if exists trg_asset_types_updated_at on asset_types;
create trigger trg_asset_types_updated_at
before update on asset_types
for each row execute function set_updated_at();

-- 4) 유형자산 테이블
create table if not exists tangible_assets (
  id bigint generated always as identity primary key,
  asset_no text unique,
  department_code text references departments(department_code),
  user_name text,
  manager_name text,
  asset_type_code text references asset_types(asset_type_code),
  manufacturer text,
  model_name text,
  serial_no text,
  cpu_spec text,
  mem_spec text,
  hdd_spec text,
  ssd_spec text,
  screen_size text,
  os_name text,
  purpose text,
  usage_location text,
  purchase_date date,
  issued_date date,
  note text,
  updated_at timestamptz not null default now(),
  last_modified_by_user_id text references dash_users(user_id)
);

drop trigger if exists trg_tangible_assets_updated_at on tangible_assets;
create trigger trg_tangible_assets_updated_at
before update on tangible_assets
for each row execute function set_updated_at();

create index if not exists idx_tangible_assets_department_code on tangible_assets(department_code);
create index if not exists idx_tangible_assets_asset_type_code on tangible_assets(asset_type_code);
create index if not exists idx_tangible_assets_serial_no on tangible_assets(serial_no);

-- 5) 무형자산 테이블
create table if not exists intangible_assets (
  id bigint generated always as identity primary key,
  license_name text not null,
  vendor_name text,
  quantity integer not null default 0 check (quantity >= 0),
  department_code text references departments(department_code),
  start_date date,
  expiry_date date,
  note text,
  updated_at timestamptz not null default now(),
  last_modified_by_user_id text references dash_users(user_id),
  asset_type_code text references asset_types(asset_type_code)
);

drop trigger if exists trg_intangible_assets_updated_at on intangible_assets;
create trigger trg_intangible_assets_updated_at
before update on intangible_assets
for each row execute function set_updated_at();

create index if not exists idx_intangible_assets_department_code on intangible_assets(department_code);
create index if not exists idx_intangible_assets_expiry_date on intangible_assets(expiry_date);

-- 6) 부서 매출 정보 테이블
create table if not exists department_sales_summary (
  id bigint generated always as identity primary key,
  department_code text not null references departments(department_code),
  month_key text not null,
  total_headcount integer not null default 0 check (total_headcount >= 0),
  sales_amount numeric(18,2) not null default 0,
  purchase_amount numeric(18,2) not null default 0,
  net_sales_amount numeric(18,2) not null default 0,
  note text,
  updated_at timestamptz not null default now(),
  last_modified_by_user_id text references dash_users(user_id),
  unique (department_code, month_key),
  check (month_key ~ '^\d{4}-\d{2}$')
);

drop trigger if exists trg_department_sales_summary_updated_at on department_sales_summary;
create trigger trg_department_sales_summary_updated_at
before update on department_sales_summary
for each row execute function set_updated_at();

create index if not exists idx_department_sales_summary_month_key on department_sales_summary(month_key);

-- RLS 활성화 (anon SELECT 허용)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dash_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tangible_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE intangible_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_sales_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select" ON departments FOR SELECT USING (true);
CREATE POLICY "Allow anon select" ON dash_users FOR SELECT USING (true);
CREATE POLICY "Allow anon select" ON asset_types FOR SELECT USING (true);
CREATE POLICY "Allow anon select" ON tangible_assets FOR SELECT USING (true);
CREATE POLICY "Allow anon select" ON intangible_assets FOR SELECT USING (true);
CREATE POLICY "Allow anon select" ON department_sales_summary FOR SELECT USING (true);

-- 7) 초기 마스터 데이터
insert into departments (department_code, department_name, is_active)
values
  ('DEV', '개발팀', true),
  ('SALES1', '영업1팀', true),
  ('SALES2', '영업2팀', true),
  ('MGMT', '경영지원팀', true)
on conflict (department_code) do nothing;

insert into asset_types (asset_type_code, major_category, sub_category, is_active, sort_order)
values
  ('MONITOR', '유형자산', '모니터', true, 10),
  ('LAPTOP',  '유형자산', '노트북', true, 20),
  ('PC',      '유형자산', 'PC', true, 30),
  ('LICENSE', '무형자산', '라이선스', true, 40)
on conflict (asset_type_code) do nothing;

insert into dash_users (user_id, role_code, user_name, department_code, is_active)
values
  ('admin', 'ADMIN', '관리자', 'MGMT', true)
on conflict (user_id) do nothing;
