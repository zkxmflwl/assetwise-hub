
-- Add sort_order, visible, use columns to business_projects
ALTER TABLE public.business_projects
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "use" boolean NOT NULL DEFAULT true;

-- Update project_status validation function to include new statuses
CREATE OR REPLACE FUNCTION public.validate_project_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.project_status not in ('영업 전', '영업 중', '수주 완료', '프로젝트 중', '프로젝트 완료', '영업 실패', '기타') then
    raise exception 'Invalid project_status: %', new.project_status;
  end if;
  return new;
end;
$function$;

-- Create trigger for project_status validation if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_validate_project_status'
  ) THEN
    CREATE TRIGGER trg_validate_project_status
      BEFORE INSERT OR UPDATE ON public.business_projects
      FOR EACH ROW
      EXECUTE FUNCTION public.validate_project_status();
  END IF;
END;
$$;
