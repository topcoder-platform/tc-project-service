# Script to find mismatches between data in DB and ES

We keep all the data in two places in DB (Database) and in ES (Elasticsearch Index). Every time we make any changes to the data in the DB all the changes are also reflected in ElasticSearch. Due to some circumstances data in ES and DB can become inconsistent.

This script may be run to find all the inconsistencies between data we have  in ES and DB and create a report.

## Configuration

The following properties can be set from env variables:

- `PROJECT_START_ID`: if set, only projects with id that large than or equal to the value are compared.
- `PROJECT_END_ID`: if set, only projects with id that less than or equal to the value are compared.
- `PROJECT_LAST_ACTIVITY_AT`: if set, only projects with property lastActivityAt that large than or equal to the value are compared.
- `REPORT_S3_BUCKET`: If set, report would be uploaded to this S3 bucket, otherwise report will be saved to disk.
- `AWS_ACCESS_KEY_ID`: AWS credentials, required to upload report to S3 bucket.
- `AWS_SECRET_ACCESS_KEY`: AWS credentials, required to upload report to S3 bucket.

There could be some fields that always mismatch in ES and DB.
The variable named `ignoredPaths` at `scripts/es-db-compare/constants.js` maintains a list of json paths which will be ignored
during the comparation. You may need to modify/add/delete items in the list.

### Required

- `PROJECT_START_ID` and `PROJECT_END_ID` must exist together.
- At least one of `PROJECT_START_ID` with `PROJECT_END_ID` or `PROJECT_LAST_ACTIVITY_AT` needs be set before running the script.
- If you want to upload report to AWS S3 you need to set `REPORT_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` environment variables.

## Usage

Set up configuration and execute command `npm run es-db-compare` on the command line.
It will then generate a HTML report with name `report.html` under the current directory.

Example commands:

- Generate a report comparing ALL the projects:

  ```bash
  PROJECT_LAST_ACTIVITY_AT=0 npm run es-db-compare
  ```

- Generate a report comparing projects that have been updated on **26 December 2019** or later:

  ```bash
  PROJECT_LAST_ACTIVITY_AT="2019-12-26" npm run es-db-compare
  ```

- Generate a report comparing projects with ID range:

  ```bash
  PROJECT_START_ID=5000 PROJECT_END_ID=6000 npm run es-db-compare
  ```

- Any of the command above can be run with additionally set `REPORT_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` environment variables to upload report to S3 bucket like:

  ```bash
  REPORT_S3_BUCKET=<S3 bucket name> AWS_ACCESS_KEY_ID=<AWS_ACCESS_KEY_ID> AWS_SECRET_ACCESS_KEY=<AWS_SECRET_ACCESS_KEY>PROJECT_LAST_ACTIVITY_AT="2019-12-26" npm run es-db-compare
  ```