--
-- CREATE NEW TABLE:
--   building_blocks
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

