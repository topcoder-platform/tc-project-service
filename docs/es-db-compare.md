# es-db-compare

## Configuration
The following properties can be set from env variables:

- PROJECT_START_ID: if set, only projects with id that large than or equal to the value are compared.
- PROJECT_END_ID: if set, only projects with id that less than or equal to the value are compared.
- PROJECT_LAST_ACTIVITY_AT: if set, only projects with property lastActivityAt that large than or equal to the value are compared.

There could be some fields that always mismatch in ES and DB.
The variable named `ignoredProperties` at `scripts/es-db-compare/constants.js` maintains a list of fields which will be ignored
during the comparation. You may need to modify/add/delete items in the list.

### Note
- `PROJECT_START_ID` and `PROJECT_END_ID` must exist together.
- At least one of `PROJECT_START_ID(also PROJECT_END_ID)` and `PROJECT_LAST_ACTIVITY_AT` needs be set before running the script.

## Usage

Set up configuration and execute command `npm run es-db-compare` on the command line.
It will then generate a HTML report with name `report.html` under the current directory.
