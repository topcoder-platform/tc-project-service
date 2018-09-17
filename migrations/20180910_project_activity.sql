--
-- UPDATE EXISTING TABLES:
--   projects:
--     added column `lastActivityAt`
--     added column `lastActivityUserId`

--
-- projects

-- Add new columns
ALTER TABLE projects ADD COLUMN "lastActivityAt" timestamp with time zone;
ALTER TABLE projects ADD COLUMN "lastActivityUserId" INT;
-- Update new colums
UPDATE projects SET "lastActivityAt"="updatedAt" WHERE "lastActivityAt" is NULL;
UPDATE projects SET "lastActivityUserId"="updatedBy" WHERE "lastActivityUserId" is NULL;
-- Set not null
ALTER TABLE projects ALTER COLUMN "lastActivityAt" SET NOT NULL;
ALTER TABLE projects ALTER COLUMN "lastActivityUserId" SET NOT NULL;
