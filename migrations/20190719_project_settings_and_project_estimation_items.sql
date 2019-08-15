-- CREATE NEW TABLES:
--   project_settings
--   project_estimation_items
--

--
-- project_settings
--

CREATE TABLE project_settings (
    id bigint NOT NULL,
    key character varying(255),
    value character varying(255),
    "valueType" character varying(255),
    "projectId" bigint NOT NULL,
    metadata json NOT NULL DEFAULT '{}'::json,
    "readPermission" json NOT NULL DEFAULT '{}'::json,
    "writePermission" json NOT NULL DEFAULT '{}'::json,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL,
    CONSTRAINT project_settings_pkey PRIMARY KEY (id)
);

CREATE SEQUENCE project_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE project_settings_id_seq OWNED BY project_settings.id;

ALTER TABLE project_settings
    ALTER COLUMN id SET DEFAULT nextval('project_settings_id_seq');

ALTER TABLE project_settings
    ADD CONSTRAINT project_settings_key_project_id UNIQUE (key, "projectId");

--
-- project_estimation_items
--

CREATE TABLE project_estimation_items (
    id bigint NOT NULL,
    "projectEstimationId" bigint NOT NULL,
    price double precision NOT NULL,
    type character varying(255) NOT NULL,
    "markupUsedReference" character varying(255) NOT NULL,
    "markupUsedReferenceId" bigint NOT NULL,
    metadata json NOT NULL DEFAULT '{}'::json,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL,
    CONSTRAINT project_estimation_items_pkey PRIMARY KEY (id)
);

CREATE SEQUENCE project_estimation_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE project_estimation_items_id_seq OWNED BY form.id;

ALTER TABLE project_estimation_items
    ALTER COLUMN id SET DEFAULT nextval('project_estimation_items_id_seq');
