--
-- UPDATE EXISTING TABLES:
--   project_member_invites:
--     added column `hashEmail`

--
-- project_member_invites

-- Add new column
ALTER TABLE project_member_invites ADD COLUMN "hashEmail" character varying(255) ;
