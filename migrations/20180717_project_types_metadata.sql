--
-- UPDATE EXISTING TABLES:
--   project_types
--     metadata column: added
--

--
-- project_types
--

ALTER TABLE project_types ADD COLUMN "metadata" json;
UPDATE project_types set metadata='{}' where metadata is null;
ALTER TABLE project_types ALTER COLUMN "metadata" SET NOT NULL;
