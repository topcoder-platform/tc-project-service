# Migration script for Bookmarks

To run any of these commands, make sure that `NODE_ENV` environment variable is set to `production` or `development` depend on which environment you would like to run migration for.

## Migrate the bookmarks to project attachments

```bash
npm run migrate:bookmarks
```

## Revert: migrate project attachments to the bookmarks

```bash
npm run migrate:bookmarks:revert
```

## References

- [Verification guide for "Migration script for Bookmarks"](Verification.md)