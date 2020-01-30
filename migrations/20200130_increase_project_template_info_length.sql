--
-- UPDATE EXISTING TABLES:
--   project_templates:
--     modify column `info`

--
-- project_templates


ALTER TABLE project_templates ALTER COLUMN "info" TYPE character varying(1024);
