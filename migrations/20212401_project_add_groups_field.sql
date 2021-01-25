-- UPDATE EXISTING projects table
--     add column `groups`

ALTER TABLE projects ADD COLUMN "groups" character varying(255)[] NOT NULL DEFAULT ARRAY[]::character varying[]::character varying(255)[];
