-- UPDATE EXISTING project_attachments table
-- Add the following columns : type and tags
-- update column : rename file_path to path

-- Add 'type' column, type is the attachment type : 'file' or 'link'
ALTER TABLE project_attachments ADD COLUMN "type" TYPE varchar(255) NOT NULL;

-- Add 'tags' column, the attachment tags
ALTER TABLE project_attachments ADD COLUMN tags TYPE _varchar NULL;

-- Rename 'file_path' column to 'path'
ALTER TABLE project_attachments RENAME COLUMN filePath TO "path";

-- Make the contentType column Nullable
ALTER TABLE project_attachments MODIFY COLUMN "contentType" character varying(45);