-- Drop project_code column
ALTER TABLE business_projects DROP COLUMN IF EXISTS project_code;

-- Drop old last_modified_by_account_id and add new UUID-based column
ALTER TABLE business_projects DROP COLUMN IF EXISTS last_modified_by_account_id;
ALTER TABLE business_projects ADD COLUMN IF NOT EXISTS last_modified_by_auth_user_id uuid REFERENCES dash_users(auth_user_id);

-- Make department_code NOT NULL (update any nulls first)
UPDATE business_projects SET department_code = '' WHERE department_code IS NULL;
ALTER TABLE business_projects ALTER COLUMN department_code SET NOT NULL;