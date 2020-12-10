--
-- UPDATE EXISTING TABLES:
--   project_estimations:
--     added column `quantity`

--
-- product_templates

-- Add new column
ALTER TABLE project_estimations ADD COLUMN "quantity" int DEFAULT 1;