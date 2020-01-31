--
-- UPDATE EXISTING TABLES:
--   project_templates:
--     modify column `info`
--   project_types:
--     modify column `info`
--   product_categories:
--     modify column `info`

--
-- project_templates

ALTER TABLE project_templates ALTER COLUMN "info" TYPE character varying(1024);

--
-- project_types

ALTER TABLE project_types ALTER COLUMN "info" TYPE character varying(1024);

--
-- product_categories

ALTER TABLE product_categories ALTER COLUMN "info" TYPE character varying(1024);