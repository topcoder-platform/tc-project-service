--
-- UPDATE EXISTING TABLES:
--   product_milestone_templates:
--     removed constraint `product_milestone_templates_productTemplateId_fkey`
--     changed column `productTemplateId` to `referenceId`
--     added column `reference`
--     added column `metadata`
--     changed table name to `milestone_templates`

--
-- product_milestone_templates
--
ALTER TABLE product_milestone_templates DROP CONSTRAINT "product_milestone_templates_productTemplateId_fkey";

ALTER TABLE product_milestone_templates RENAME COLUMN "productTemplateId" TO "referenceId";

ALTER TABLE product_milestone_templates ADD COLUMN "reference" character varying(45);
UPDATE product_milestone_templates set reference='productTemplate' where reference is null;
ALTER TABLE product_milestone_templates ALTER COLUMN "reference" SET NOT NULL;

ALTER TABLE product_milestone_templates ADD COLUMN "metadata" json;
UPDATE product_milestone_templates set metadata='{}' where metadata is null;
ALTER TABLE product_milestone_templates ALTER COLUMN "metadata" SET NOT NULL;

ALTER TABLE product_milestone_templates RENAME TO milestone_templates;


