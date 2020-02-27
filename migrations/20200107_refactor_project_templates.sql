--
-- UPDATE EXISTING TABLES:
--   project_templates:
--     added column `subCategory`
--     added column `metadata`

--
-- project_templates


ALTER TABLE project_templates ADD COLUMN "subCategory" character varying(45);
ALTER TABLE project_templates ADD COLUMN "metadata" json NOT NULL DEFAULT '{}'::json;
