
-- 1. Rename column schedule_note -> sales_schedule_note
ALTER TABLE public.business_projects RENAME COLUMN schedule_note TO sales_schedule_note;

-- 2. Add new column secured_schedule_note
ALTER TABLE public.business_projects ADD COLUMN secured_schedule_note text;

-- 3. Update status values
UPDATE public.business_projects SET project_status = '기회 식별' WHERE project_status = '영업 전';
UPDATE public.business_projects SET project_status = '영업 종결' WHERE project_status = '영업 실패';

-- 4. Update the validate_project_status trigger function
CREATE OR REPLACE FUNCTION public.validate_project_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.project_status not in ('기회 식별', '영업 중', '수주 완료', '프로젝트 중', '프로젝트 완료', '영업 종결', '기타') then
    raise exception 'Invalid project_status: %', new.project_status;
  end if;
  return new;
end;
$function$;
