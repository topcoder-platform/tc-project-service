--
-- CREATE NEW TABLE:
--   scope_change_requests
--

CREATE TABLE scope_change_requests
(
    id bigint NOT NULL,
    "projectId" bigint NOT NULL,
    "oldScope" json NOT NULL,
    "newScope" json NOT NULL,
    status character varying(45) NOT NULL,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "approvedAt" timestamp with time zone,
    "deletedBy" integer,
    "createdBy" integer NOT NULL,
    "updatedBy" integer NOT NULL,
    "approvedBy" integer
);


CREATE SEQUENCE scope_change_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE scope_change_requests_id_seq OWNED BY scope_change_requests.id;

ALTER TABLE scope_change_requests
    ALTER COLUMN id SET DEFAULT nextval('scope_change_requests_id_seq');

ALTER TABLE ONLY scope_change_requests
   ADD CONSTRAINT scope_change_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY scope_change_requests
    ADD CONSTRAINT "scope_change_requests_projectId_fkey" FOREIGN KEY ("projectId")
    REFERENCES projects(id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;
