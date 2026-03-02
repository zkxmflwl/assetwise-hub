ALTER TABLE department_sales_summary
  DROP COLUMN IF EXISTS cumulative_sales_amount,
  DROP COLUMN IF EXISTS cumulative_purchase_amount,
  DROP COLUMN IF EXISTS cumulative_net_sales_amount,
  DROP COLUMN IF EXISTS cumulative_qoq,
  DROP COLUMN IF EXISTS active_project_count,
  DROP COLUMN IF EXISTS monthly_order_project_count;