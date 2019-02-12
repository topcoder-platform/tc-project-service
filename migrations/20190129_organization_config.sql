--
-- CREATE NEW TABLE:
--   org_config
--
CREATE TABLE org_config (
    id bigint NOT NULL,
    "orgId" character varying(45) NOT NULL,
    "configName" character varying(45) NOT NULL,
    "configValue" character varying(512),
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL
);

CREATE SEQUENCE org_config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE org_config_id_seq OWNED BY org_config.id;

ALTER TABLE org_config
    ALTER COLUMN id SET DEFAULT nextval('org_config_id_seq');
