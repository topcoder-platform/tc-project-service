--
-- UPDATE EXISTING TABLES:
--   project_types
--     icon column: added
--     info column: added
--     question column: added
--     aliases column: added
--

--
-- project_types
--
ALTER TABLE project_types ADD COLUMN "icon" character varying(255);
UPDATE project_types set icon='product-cat-app' where icon is null;
ALTER TABLE project_types ALTER COLUMN "icon" SET NOT NULL;

ALTER TABLE project_types ADD COLUMN "info" character varying(255);
UPDATE project_types set info="displayName" where info is null;
ALTER TABLE project_types ALTER COLUMN "info" SET NOT NULL;

ALTER TABLE project_types ADD COLUMN "question" character varying(255);
UPDATE project_types set question='What do you want to develop?' where question is null;
ALTER TABLE project_types ALTER COLUMN "question" SET NOT NULL;

ALTER TABLE project_types ADD COLUMN "aliases" json;
UPDATE project_types set aliases='{}' where aliases is null;
ALTER TABLE project_types ALTER COLUMN "aliases" SET NOT NULL;

ALTER TABLE project_types ADD COLUMN "hidden" boolean DEFAULT false;
ALTER TABLE project_types ADD COLUMN "disabled" boolean DEFAULT false;