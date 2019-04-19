--
-- UPDATE EXISTING TABLES:
--   product_templates:
--     added column `isAddOn`

--
-- product_templates

-- Add new column
ALTER TABLE product_templates ADD COLUMN "isAddOn" boolean DEFAULT false;
-- Update new column
UPDATE product_templates SET "isAddOn"='true' WHERE "subCategory" != "category";
