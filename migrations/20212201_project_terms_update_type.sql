-- UPDATE EXISTING projects table
--     modify column `terms`

-- drop existent column first to avoid any issues during type convertion as we don't need the data if there is any
ALTER TABLE projects DROP COLUMN "terms";
-- now create a column with a new type
ALTER TABLE projects ADD COLUMN "terms" character varying(255)[] NOT NULL DEFAULT ARRAY[]::character varying[]::character varying(255)[];
