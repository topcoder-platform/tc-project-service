--
-- CREATE NEW TABLE:
--   project_estimations
--

CREATE TABLE project_estimations
(
    id bigint NOT NULL,
    "buildingBlockKey" character varying(255) NOT NULL,
    conditions character varying(512) NOT NULL,
    price double precision NOT NULL,
    "minTime" integer NOT NULL,
    "maxTime" integer NOT NULL,
    metadata json NOT NULL DEFAULT '{}'::json,
    "projectId" bigint NOT NULL,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" integer NOT NULL,
    "updatedBy" integer NOT NULL,
    CONSTRAINT project_estimations_pkey PRIMARY KEY (id)
);

CREATE SEQUENCE project_estimations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE project_estimations_id_seq OWNED BY project_estimations.id;

ALTER TABLE project_estimations
    ALTER COLUMN id SET DEFAULT nextval('project_estimations_id_seq');
