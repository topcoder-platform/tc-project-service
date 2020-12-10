-- UPDATE EXISTING TABLES:
--   product_templates
--     category column: added
-- CREATE NEW TABLE:
--   product_categories

--
-- product_categories
--
CREATE TABLE product_categories (
    key character varying(45) NOT NULL,
    "displayName" character varying(255) NOT NULL,
    "icon" character varying(255) NOT NULL,
    "info" character varying(255) NOT NULL,
    "question" character varying(255) NOT NULL,
    "aliases" json NOT NULL,
    "hidden" boolean DEFAULT false,
    "disabled" boolean DEFAULT false,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" integer,
    "createdBy" integer NOT NULL,
    "updatedBy" integer NOT NULL
);

ALTER TABLE ONLY product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (key);

--
-- product_templates
--
ALTER TABLE product_templates ADD COLUMN "category" character varying(45);
UPDATE product_templates set category='generic' where category is null;
ALTER TABLE product_templates ALTER COLUMN "category" SET NOT NULL;
