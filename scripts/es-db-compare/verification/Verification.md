# Verification

## Steps
- Set `REPORT_S3_BUCKET`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY` keys to `config/default.js` file. If you don't set report will be generated in local file
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

- See uploaded file in AWS Console or See `./report.html` under the root project directory.