--
-- CREATE NEW TABLE:
--   building_blocks
--   project_estimation_item
--
CREATE TABLE building_blocks (
    id bigint NOT NULL,
    "key" character varying(255) NOT NULL,
    "config" json NOT NULL DEFAULT '{}'::json,
    "privateConfig" json NOT NULL DEFAULT '{}'::json,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL
);

ALTER TABLE building_blocks
    ADD CONSTRAINT building_blocks_key_uniq UNIQUE (key);

CREATE SEQUENCE building_blocks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE building_blocks_id_seq OWNED BY building_blocks.id;

ALTER TABLE building_blocks
    ALTER COLUMN id SET DEFAULT nextval('building_blocks_id_seq');

ALTER TABLE ONLY building_blocks
    ADD CONSTRAINT building_blocks_pkey PRIMARY KEY (id);

CREATE TABLE project_estimation_items (
    id bigint NOT NULL,
    "projectEstimationId" bigint NOT NULL,
    "price" double precision NOT NULL,
    "type" character varying(255) NOT NULL,
    "markupUsedReference" character varying(255) NOT NULL,
    "markupUsedReferenceId" bigint NOT NULL,
    "metadata" json NOT NULL DEFAULT '{}'::json,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL
);

CREATE SEQUENCE project_estimation_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE project_estimation_items_id_seq OWNED BY project_estimation_items.id;

ALTER TABLE project_estimation_items
    ALTER COLUMN id SET DEFAULT nextval('project_estimation_items_id_seq');

ALTER TABLE ONLY project_estimation_items
    ADD CONSTRAINT project_estimation_items_pkey PRIMARY KEY (id);
