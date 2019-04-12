--
-- product_templates
--
ALTER TABLE product_templates ALTER COLUMN "template" DROP NOT NULL;

ALTER TABLE product_templates ADD COLUMN "form" json;
