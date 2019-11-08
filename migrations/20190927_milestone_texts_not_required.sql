--
-- UPDATE EXISTING TABLES:
--   milestones

ALTER TABLE milestones ALTER COLUMN "plannedText" DROP NOT NULL;
ALTER TABLE milestones ALTER COLUMN "activeText" DROP NOT NULL;
ALTER TABLE milestones ALTER COLUMN "completedText" DROP NOT NULL;
ALTER TABLE milestones ALTER COLUMN "blockedText" DROP NOT NULL;