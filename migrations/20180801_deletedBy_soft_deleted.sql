--
-- UPDATE EXISTING TABLES:
--   projects
--     deletedBy column: added
--   project_attachments
--     deletedBy column: added
--   project_members
--     deletedBy column: added
--

--
-- projects
--
ALTER TABLE projects ADD COLUMN "deletedBy" bigint;

--
-- project_attachments
--
ALTER TABLE project_attachments ADD COLUMN "deletedBy" bigint;

--
-- project_members
--
ALTER TABLE project_members ADD COLUMN "deletedBy" bigint;