--
-- UPDATE EXISTING TABLES:
--   project_phases
--     description column: added
--     requirements column: added

ALTER TABLE project_phases ADD COLUMN "description" character varying(255);
ALTER TABLE project_phases ADD COLUMN "requirements" text;