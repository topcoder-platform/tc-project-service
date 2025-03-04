--
-- CREATE NEW TABLE:
--   copilot_requests
--
CREATE TABLE copilot_requests (
    id bigint NOT NULL,
    "data" json NOT NULL,
    "status" character varying(16) NOT NULL,
    "projectId" bigint NOT NULL,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL
);

CREATE SEQUENCE copilot_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE copilot_requests_id_seq OWNED BY copilot_requests.id;

ALTER TABLE copilot_requests
    ALTER COLUMN id SET DEFAULT nextval('copilot_requests_id_seq');

ALTER TABLE ONLY copilot_requests
    ADD CONSTRAINT "copilot_requests_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY copilot_requests
    ADD CONSTRAINT "copilot_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES projects(id) ON UPDATE CASCADE ON DELETE SET NULL;