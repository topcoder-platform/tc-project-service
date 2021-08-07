CREATE SEQUENCE project_phase_approval_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

DROP TYPE IF EXISTS "enum_project_phase_approval_decision";
CREATE TYPE "enum_project_phase_approval_decision" AS ENUM ('approve', 'reject');

CREATE TABLE "project_phase_approval" (
    "id" int8 NOT NULL DEFAULT nextval('project_phase_approval_id_seq'::regclass),
    "phaseId" int8 NOT NULL,
    "decision" "enum_project_phase_approval_decision" NOT NULL,
    "comment" varchar,
    "startDate" timestamptz NOT NULL,
    "endDate" timestamptz,
    "expectedEndDate" timestamptz NOT NULL,
    "deletedAt" timestamptz,
    "createdAt" timestamptz,
    "updatedAt" timestamptz,
    "deletedBy" int4,
    "createdBy" int4 NOT NULL,
    "updatedBy" int4 NOT NULL,
    CONSTRAINT "project_phase_approval_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "project_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("id")
);