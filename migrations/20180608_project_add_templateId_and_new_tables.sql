--
-- UPDATE EXISTING TABLES:
--   projects
--     templateId column: added
--     version column: added
-- CREATE NEW TABLES:
--   milestones
--   phase_products
--   product_milestone_templates
--   product_templates
--   project_phases
--   project_templates
--   project_types
--   timelines
--

--
-- projects
--
ALTER TABLE projects ADD COLUMN "templateId" bigint;

-- make sure to update existing projects to have this field set to "v2"
ALTER TABLE projects ADD COLUMN "version" varchar(3) NOT NULL DEFAULT 'v2';
-- make sure new projects from now on have "v3" as default value
ALTER TABLE projects ALTER COLUMN "version" SET DEFAULT 'v3';

--
-- milestones
--

CREATE TABLE milestones (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    duration integer NOT NULL,
    "startDate" timestamp with time zone NOT NULL,
    "endDate" timestamp with time zone,
    "actualStartDate" timestamp with time zone,
    "completionDate" timestamp with time zone,
    status character varying(45) NOT NULL,
    type character varying(45) NOT NULL,
    details json,
    "order" integer NOT NULL,
    "plannedText" character varying(512) NOT NULL,
    "activeText" character varying(512) NOT NULL,
    "completedText" character varying(512) NOT NULL,
    "blockedText" character varying(512) NOT NULL,
    "hidden" boolean DEFAULT false,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL,
    "timelineId" bigint
);

CREATE SEQUENCE milestones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE milestones_id_seq OWNED BY milestones.id;


--
-- phase_products
--

CREATE TABLE phase_products (
    id bigint NOT NULL,
    name character varying(255),
    "projectId" bigint,
    "directProjectId" bigint,
    "billingAccountId" bigint,
    "templateId" bigint DEFAULT 0,
    type character varying(255),
    "estimatedPrice" double precision DEFAULT 0,
    "actualPrice" double precision DEFAULT 0,
    details json DEFAULT '{}'::json,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" integer,
    "createdBy" integer NOT NULL,
    "updatedBy" integer NOT NULL,
    "phaseId" bigint
);


CREATE SEQUENCE phase_products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE phase_products_id_seq OWNED BY phase_products.id;

--
-- product_milestone_templates
--

CREATE TABLE product_milestone_templates (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    duration integer NOT NULL,
    type character varying(45) NOT NULL,
    "order" integer NOT NULL,
    "plannedText" character varying(512) NOT NULL,
    "activeText" character varying(512) NOT NULL,
    "blockedText" character varying(512) NOT NULL,
    "completedText" character varying(512) NOT NULL,
    "hidden" boolean DEFAULT false,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL,
    "productTemplateId" bigint
);

CREATE SEQUENCE product_milestone_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE product_milestone_templates_id_seq OWNED BY product_milestone_templates.id;


--
-- product_templates
--
CREATE TABLE product_templates (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    "productKey" character varying(45) NOT NULL,
    icon character varying(255) NOT NULL,
    brief character varying(45) NOT NULL,
    details character varying(255) NOT NULL,
    aliases json NOT NULL,
    template json NOT NULL,
    "hidden" boolean DEFAULT false,
    "disabled" boolean DEFAULT false,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL
);

CREATE SEQUENCE product_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE product_templates_id_seq OWNED BY product_templates.id;

--
-- project_phases
--

CREATE TABLE project_phases (
    id bigint NOT NULL,
    name character varying(255),
    status character varying(255),
    "startDate" timestamp with time zone,
    "endDate" timestamp with time zone,
    duration integer,
    budget double precision DEFAULT 0,
    "spentBudget" double precision DEFAULT 0,
    progress double precision DEFAULT 0,
    details json DEFAULT '{}'::json,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" integer,
    "createdBy" integer NOT NULL,
    "updatedBy" integer NOT NULL,
    "projectId" bigint
);

CREATE SEQUENCE project_phases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE project_phases_id_seq OWNED BY project_phases.id;


--
-- project_templates
--
CREATE TABLE project_templates (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    key character varying(45) NOT NULL,
    category character varying(45) NOT NULL,
    icon character varying(255) NOT NULL,
    question character varying(255) NOT NULL,
    info character varying(255) NOT NULL,
    aliases json NOT NULL,
    scope json NOT NULL,
    phases json NOT NULL,
    "disabled" boolean DEFAULT false,
    "hidden" boolean DEFAULT false,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL
);

CREATE SEQUENCE project_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE project_templates_id_seq OWNED BY project_templates.id;

--
-- project_types
--

CREATE TABLE project_types (
    key character varying(45) NOT NULL,
    "displayName" character varying(255) NOT NULL,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" integer,
    "createdBy" integer NOT NULL,
    "updatedBy" integer NOT NULL
);

--
-- timelines
--
CREATE TABLE timelines (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    "startDate" timestamp with time zone NOT NULL,
    "endDate" timestamp with time zone,
    reference character varying(45) NOT NULL,
    "referenceId" bigint NOT NULL,
    "deletedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "deletedBy" bigint,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL
);

CREATE SEQUENCE timelines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE timelines_id_seq OWNED BY timelines.id;


ALTER TABLE ONLY milestones ALTER COLUMN id SET DEFAULT nextval('milestones_id_seq'::regclass);

ALTER TABLE ONLY phase_products ALTER COLUMN id SET DEFAULT nextval('phase_products_id_seq'::regclass);

ALTER TABLE ONLY product_milestone_templates ALTER COLUMN id SET DEFAULT nextval('product_milestone_templates_id_seq'::regclass);

ALTER TABLE ONLY product_templates ALTER COLUMN id SET DEFAULT nextval('product_templates_id_seq'::regclass);

ALTER TABLE ONLY project_phases ALTER COLUMN id SET DEFAULT nextval('project_phases_id_seq'::regclass);

ALTER TABLE ONLY project_templates ALTER COLUMN id SET DEFAULT nextval('project_templates_id_seq'::regclass);

ALTER TABLE ONLY timelines ALTER COLUMN id SET DEFAULT nextval('timelines_id_seq'::regclass);

ALTER TABLE ONLY milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);

ALTER TABLE ONLY phase_products
    ADD CONSTRAINT phase_products_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product_milestone_templates
    ADD CONSTRAINT product_milestone_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product_templates
    ADD CONSTRAINT product_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY project_phases
    ADD CONSTRAINT project_phases_pkey PRIMARY KEY (id);

ALTER TABLE ONLY project_templates
    ADD CONSTRAINT project_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY project_types
    ADD CONSTRAINT project_types_pkey PRIMARY KEY (key);

ALTER TABLE ONLY timelines
    ADD CONSTRAINT timelines_pkey PRIMARY KEY (id);

ALTER TABLE ONLY milestones
    ADD CONSTRAINT "milestones_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES timelines(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY phase_products
    ADD CONSTRAINT "phase_products_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES project_phases(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY project_phases
    ADD CONSTRAINT "project_phases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES projects(id) ON UPDATE CASCADE ON DELETE SET NULL;
