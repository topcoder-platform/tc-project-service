# Verification

## Steps
- Start ES and DB services: `docker-compose -f local/docker-compose.yml up`
- Insert ES and DB data:

  ``` bash
  NODE_ENV=development npm run sync:db
  NODE_ENV=development npx babel-node scripts/es-db-compare/verification/insertDBData.js
  NODE_ENV=development npm run sync:es
  NODE_ENV=development npx babel-node scripts/es-db-compare/verification/insertESData.js
  ```

- Generate a html report under the project root directory comparing all the projects:

  ```bash
  PROJECT_LAST_ACTIVITY_AT=0 npm run es-db-compare
  ```

  - See `./report.html` under the root project directory.

- To upload report to the S3 bucket, set `REPORT_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` environment variables and run the same command. For example like this:

  ```bash
  REPORT_S3_BUCKET=<S3 bucket name> AWS_ACCESS_KEY_ID=<AWS_ACCESS_KEY_ID> AWS_SECRET_ACCESS_KEY=<AWS_SECRET_ACCESS_KEY> PROJECT_LAST_ACTIVITY_AT=0 npm run es-db-compare
  ```

  - Report would be uploaded to S3 bucket `REPORT_S3_BUCKET` with name in format `es-db-report-<NODE_ENV>-<YYYY-MM-DD-HH-MM-SS>.html`