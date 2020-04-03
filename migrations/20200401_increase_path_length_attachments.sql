-- UPDATE EXISTING project_attachments table
--     modify column `path`

ALTER TABLE project_attachments  ALTER COLUMN "path" TYPE character varying(2048);