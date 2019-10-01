--
-- CREATE NEW TABLE:
--   work_streams
--
CREATE TABLE work_streams (
    id bigint NOT NULL,
    "name" character varying(255) NOT NULL,
    "type" character varying(45) NOT NULL,
    "status" character varying(255) NOT NULL,
    "projectId" bigint NOT NULL,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL
);

CREATE SEQUENCE work_streams_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE work_streams_id_seq OWNED BY work_streams.id;

ALTER TABLE work_streams
    ALTER COLUMN id SET DEFAULT nextval('work_streams_id_seq');

ALTER TABLE ONLY work_streams
    ADD CONSTRAINT "work_streams_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY work_streams
    ADD CONSTRAINT "work_streams_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES projects(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- CREATE NEW TABLE:
--   work_management_permissions
--
CREATE TABLE work_management_permissions (
    id bigint NOT NULL,
    "policy" character varying(255) NOT NULL,
    "permission" json NOT NULL,
    "projectTemplateId" bigint NOT NULL,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL
);

CREATE SEQUENCE work_management_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE work_management_permissions_id_seq OWNED BY work_management_permissions.id;

ALTER TABLE work_management_permissions
    ALTER COLUMN id SET DEFAULT nextval('work_management_permissions_id_seq');

--
-- CREATE NEW TABLE:
--   phase_work_streams
--
CREATE TABLE phase_work_streams (
    "workStreamId" bigint NOT NULL,
    "phaseId" bigint NOT NULL
);

ALTER TABLE ONLY phase_work_streams
    ADD CONSTRAINT "phase_work_streams_pkey" PRIMARY KEY ("workStreamId", "phaseId");

ALTER TABLE ONLY phase_work_streams
    ADD CONSTRAINT "phase_work_streams_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES project_phases(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY phase_work_streams
    ADD CONSTRAINT "phase_work_streams_workStreamId_fkey" FOREIGN KEY ("workStreamId") REFERENCES work_streams(id) ON UPDATE CASCADE ON DELETE CASCADE;
