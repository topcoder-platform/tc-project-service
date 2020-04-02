# Verification guide for "Migration script for Bookmarks"

To check the bookmarks migration, follow the instructions below:

```bash
-- sync the database (This will drop and re-create the tables)
NODE_ENV=development npm run sync:db
-- Insert the test data
NODE_ENV=development npx babel-node migrations/bookmarks/insertTestData.js
```

-- Check the database tables projects and project_attachments using the following SQL statements:

```sql
select id, name, bookmarks from projects order by id;
select * from project_attachments;
```

-- Migrate the bookmarks to project attachments
```bash
NODE_ENV=development npm run migrate:bookmarks
```

-- Re-check the database usig the SQL statements above

-- Revert the migration using the following command :
```bash
NODE_ENV=development npm run migrate:bookmarks:revert
```

-- Re-check the database using the following SQL statements:
```sql
select id, name, bookmarks from projects order by id;
select id, pa.type, pa."deletedAt" from project_attachments pa
```