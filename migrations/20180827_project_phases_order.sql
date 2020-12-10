--
-- UPDATE EXISTING TABLES:
--   project_phases:
--     added column `order`

--
-- project_phases
--
ALTER TABLE project_phases ADD COLUMN "order" integer NULL;
