-- make sure to update existing projects to have this field set to "v2"
ALTER TABLE projects ADD COLUMN "version" varchar(3) NOT NULL DEFAULT 'v2';
-- make sure new projects from now on have "v3" as default value
ALTER TABLE projects ALTER COLUMN "version" SET DEFAULT 'v3'
