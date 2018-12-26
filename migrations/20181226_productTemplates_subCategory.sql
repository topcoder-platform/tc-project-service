--
-- UPDATE EXISTING TABLES:
--   product_templates:
--     added column `subCategory`

--
-- product_templates

-- Add new column
ALTER TABLE product_templates ADD COLUMN "subCategory" character varying(45);
-- Update new column
UPDATE product_templates SET "subCategory"="category" WHERE "subCategory" is NULL;
-- Set not null
ALTER TABLE product_templates ALTER COLUMN "subCategory" SET NOT NULL;
