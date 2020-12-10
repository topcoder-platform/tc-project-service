--
-- form
--

CREATE TABLE form (
    id bigint NOT NULL,
    "key" character varying(45) NOT NULL,
    "version" bigint DEFAULT 1 NOT NULL,
    "revision" bigint DEFAULT 1 NOT NULL,
    "config" json DEFAULT '{}'::json NOT NULL,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL
);

ALTER TABLE form
    ADD CONSTRAINT form_key_version_revision UNIQUE (key, version, revision);

CREATE SEQUENCE form_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE form_id_seq OWNED BY form.id;

--
-- price_config
--

CREATE TABLE price_config (
    id bigint NOT NULL,
    "key" character varying(45) NOT NULL,
    "version" bigint DEFAULT 1 NOT NULL,
    "revision" bigint DEFAULT 1 NOT NULL,
    "config" json DEFAULT '{}'::json NOT NULL,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL
);

ALTER TABLE price_config
    ADD CONSTRAINT price_config_key_version_revision UNIQUE (key, version, revision);

CREATE SEQUENCE price_config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE price_config_id_seq OWNED BY price_config.id;

--
-- plan_config
--

CREATE TABLE plan_config (
    id bigint NOT NULL,
    "key" character varying(45) NOT NULL,
    "version" bigint DEFAULT 1 NOT NULL,
    "revision" bigint DEFAULT 1 NOT NULL,
    "config" json DEFAULT '{}'::json NOT NULL,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL
);

ALTER TABLE plan_config
    ADD CONSTRAINT plan_config_key_version_revision UNIQUE (key, version, revision);

CREATE SEQUENCE plan_config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE plan_config_id_seq OWNED BY plan_config.id;
