-- UPDATE EXISTING project_attachments table
-- Add the following columns : type and tags
-- update column : rename file_path to path

-- Add 'type' column, type is the attachment type : 'file' or 'link'
ALTER TABLE project_attachments ADD COLUMN "type" character varying(255);
-- As all existent data is files, set the "type" to file
UPDATE project_attachments SET "type"='file';
-- Set not null
ALTER TABLE project_attachments ALTER COLUMN "type" SET NOT NULL;

-- Add 'tags' column, the attachment tags
ALTER TABLE project_attachments ADD COLUMN tags character varying(255)[] NULL;

-- Rename 'file_path' column to 'path'
ALTER TABLE project_attachments RENAME COLUMN "filePath" TO "path";

-- Make the contentType column Nullable
ALTER TABLE project_attachments ALTER COLUMN "contentType" DROP NOT NULL;