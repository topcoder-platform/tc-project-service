--
-- FIX for 20190316_extract_scope_from_project_templates.sql
-- apply created auto-increments sequences to `id` columns

ALTER TABLE form
    ALTER COLUMN id SET DEFAULT nextval('form_id_seq');

ALTER TABLE price_config
    ALTER COLUMN id SET DEFAULT nextval('price_config_id_seq');

ALTER TABLE plan_config
    ALTER COLUMN id SET DEFAULT nextval('plan_config_id_seq');
