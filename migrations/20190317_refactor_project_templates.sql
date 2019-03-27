--
-- project_templates
--
ALTER TABLE project_templates ALTER COLUMN "scope" DROP NOT NULL;
ALTER TABLE project_templates ALTER COLUMN "phases" DROP NOT NULL;

ALTER TABLE project_templates ADD COLUMN "planConfig" json;
ALTER TABLE project_templates ADD COLUMN "priceConfig" json;
ALTER TABLE project_templates ADD COLUMN "form" json;
