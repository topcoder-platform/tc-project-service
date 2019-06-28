--
-- Create table status history
--

CREATE TABLE status_history (
    id bigint,
    "reference" character varying(45) NOT NULL,
    "referenceId" bigint NOT NULL,
    "status" character varying(45) NOT NULL,
    "comment" text,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "createdBy" integer NOT NULL,
    "updatedBy" integer NOT NULL
);

CREATE SEQUENCE status_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE status_history_id_seq OWNED BY status_history.id;

ALTER TABLE ONLY status_history ALTER COLUMN id SET DEFAULT nextval('status_history_id_seq'::regclass);

ALTER TABLE ONLY status_history
    ADD CONSTRAINT status_history_pkey PRIMARY KEY (id);