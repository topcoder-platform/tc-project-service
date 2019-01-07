--
-- CREATE NEW TABLES:
--   project_member_invites
--

--
-- project_member_invites
--

CREATE TABLE project_member_invites (
    id bigint NOT NULL,
    "projectId" bigint,
    "userId" bigint,
    email character varying(255),
    role character varying(255) NOT NULL,
    status character varying(255) NOT NULL,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedAt" timestamp with time zone,
    "createdBy" integer NOT NULL,
    "updatedBy" integer NOT NULL,
    "deletedBy" bigint
);

ALTER TABLE ONLY project_member_invites
   ADD CONSTRAINT project_member_invites_pkey PRIMARY KEY (id);

CREATE SEQUENCE project_member_invites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE project_member_invites_id_seq OWNED BY project_member_invites.id;

ALTER TABLE project_member_invites
    ALTER COLUMN id SET DEFAULT nextval('project_member_invites_id_seq');

ALTER TABLE ONLY project_member_invites
    ADD CONSTRAINT "project_member_invites_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE;