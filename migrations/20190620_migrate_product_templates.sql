--
-- UPDATE EXISTING TABLES:
--   template:
--     remove `sections` if exists and change `questions` to `sections`

--
-- product_templates

UPDATE product_templates
SET template = (template::jsonb #- '{questions}' #- '{sections}') || jsonb_build_object('sections', template::jsonb ->'questions')
WHERE template::jsonb ? 'questions';
