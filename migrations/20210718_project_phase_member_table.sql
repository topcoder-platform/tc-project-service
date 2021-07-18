CREATE TABLE "public"."project_phase_member" (
    "id" int8 NOT NULL DEFAULT nextval('project_phase_member_id_seq'::regclass),
    "userId" int8 NOT NULL,
    "deletedAt" timestamptz,
    "createdAt" timestamptz,
    "updatedAt" timestamptz,
    "deletedBy" int4,
    "createdBy" int4 NOT NULL,
    "updatedBy" int4 NOT NULL,
    "phaseId" int8,
    CONSTRAINT "project_phase_member_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "public"."project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    PRIMARY KEY ("id")
);