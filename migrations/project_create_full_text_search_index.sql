ALTER TABLE projects ADD COLUMN "projectFullText" text;
UPDATE projects SET "projectFullText" = lower(name || ' ' || coalesce(description, '') || ' ' || coalesce(details#>>'{utm, code}', ''));
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX project_text_search_idx ON projects USING GIN("projectFullText" gin_trgm_ops);

CREATE OR REPLACE FUNCTION project_text_update_trigger() RETURNS trigger AS $$
    begin
        new."projectFullText" :=
        lower(new.name || ' ' || coalesce(new.description, '') || ' ' || coalesce(new.details#>>'{utm, code}', ''));
        return new;
    end
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_text_update ON projects;
CREATE TRIGGER project_text_update BEFORE INSERT OR UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE project_text_update_trigger();
