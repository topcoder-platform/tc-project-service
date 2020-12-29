# Topcoder Projects Service

Microservice to manage CRUD operations for all things Projects.

**Note: Steps mentioned below are best to our capability as guide for local deployment, however, we expect from contributor, being a developer, to resolve run-time issues (e.g. OS and node version issues etc), if any.**

- [Local Development](#local-development)
  - [Requirements](#requirements)
  - [Steps to run locally](#steps-to-run-locally)
- [Run Connect App with Project Service locally](#run-connect-app-with-project-service-locally)
- [Import and Export data](#import-and-export-data)
  - [📤 Export data](#-export-data)
  - [📥 Import data](#-import-data)
- [Import metadata from api.topcoder-dev.com (deprecated)](#import-metadata-from-apitopcoder-devcom-deprecated)
- [Run via Docker](#run-via-docker)
- [NPM Commands](#npm-commands)
- [Kafka commands](#kafka-commands)
  - [Create Topic](#create-topic)
  - [List Topics](#list-topics)
  - [Watch Topic](#watch-topic)
  - [Post Message to Topic (from stdin)](#post-message-to-topic-from-stdin)
- [Test](#test)
- [JWT Authentication](#jwt-authentication)
- [Documentation](#documentation)

## Local Development

Local setup should work good on **Linux**, **macOS** and **Windows**.

### Requirements

* [docker-compose](https://docs.docker.com/compose/install/) - We use docker-compose for running dependencies locally.
* [Node.js](https://nodejs.org/) version 12 - consider using [nvm](https://github.com/creationix/nvm) or equivalent to manage your node version
* Install [libpg](https://www.npmjs.com/package/pg-native)

### Steps to run locally
1. 📦 Install npm dependencies

   ```bash
   npm install
   ```

2. ⚙ Local config

    1. In the `tc-project-service` root directory create `.env` file with the next environment variables. Values for **Auth0 config** should be shared with you on the forum.<br>
       ```bash
       # Auth0 config
       AUTH0_CLIENT_ID=
       AUTH0_CLIENT_SECRET=
       AUTH0_URL=
       AUTH0_AUDIENCE=
       AUTH0_PROXY_SERVER_URL=

       # Locally deployed services (via docker-compose)
       PROJECTS_ES_URL=dockerhost:9200
       DB_MASTER_URL=postgres://coder:mysecretpassword@dockerhost:5432/projectsdb
       BUS_API_URL=http://dockerhost:8002/v5

       # Locally we usually run in Development mode
       NODE_ENV=development
       ```
       - Values from this file would be automatically used by many `npm` commands.
       - ⚠️ Never commit this file or its copy to the repository!

    1. Set `dockerhost` to point the IP address of Docker. Docker IP address depends on your system. For example if docker is run on IP `127.0.0.1` add a the next line to your `/etc/hosts` file:
       ```
       127.0.0.1       dockerhost
       ```

       Alternatively, you may update `.env` file and replace `dockerhost` with your docker IP address.

1. 🚢 Start docker-compose with services which are required to start Project Service locally

   ```bash
   npm run services:up
   ```

   Wait until all containers are fully started. As a good indicator, wait until `project-processor-es` successfully started by viewing its logs:

   ```bash
   npm run services:logs -- -f project-processor-es
   ```

   <details><summary>Click to see a good logs example</summary>
   <br>

      - first it would be waiting for `kafka-client` to create all the required topics and exit, you would see:

         ```
         project-processor-es_1        | Waiting for kafka-client to exit....
         ```

      - after that, `project-processor-es` would be started itself. Make sure it successfully connected to Kafka, you should see 3 lines with text `Subscribed to project.action.`:

      ```
      project-processor-es_1        | 2020-02-19T03:18:46.523Z DEBUG no-kafka-client Subscribed to project.action.update:0 offset 0 leader kafka:9093
      project-processor-es_1        | 2020-02-19T03:18:46.524Z DEBUG no-kafka-client Subscribed to project.action.delete:0 offset 0 leader kafka:9093
      project-processor-es_1        | 2020-02-19T03:18:46.528Z DEBUG no-kafka-client Subscribed to project.action.create:0 offset 0 leader kafka:9093
      ```
   </details>

   <br>
   If you want to learn more about docker-compose configuration
   <details><summary>see more details here</summary>
   <br>

      This docker-compose file starts the next services:
      |  Service | Name | Port  |
      |----------|:-----:|:----:|
      | PostgreSQL | db | 5432 |
      | Elasticsearch | esearch | 9200 |
      | Mock Service (not in use) | jsonserver | 3001  |
      | Zookeeper | zookeeper | 2181  |
      | Kafka | kafka | 9092  |
      | [tc-bus-api](https://github.com/topcoder-platform/tc-bus-api) | tc-bus-api | 8002  |
      | [project-processor-es](https://github.com/topcoder-platform/project-processor-es) | project-processor-es | 5000  |
      | [tc-notifications-api](https://github.com/topcoder-platform/tc-notifications) | tc-notifications-api | 4000  |
      | [tc-notifications-processor](https://github.com/topcoder-platform/tc-notifications) | tc-notifications-processor | 4001  |

      - as many of the Topcoder services in this docker-compose require Auth0 configuration for M2M calls, our docker-compose file passes environment variables `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_URL`, `AUTH0_AUDIENCE`, `AUTH0_PROXY_SERVER_URL` to its containers. docker-compose takes them from `.env` file if provided.

      - `docker-compose` automatically would create Kafka topics which are used by `tc-project-service` listed in `local/full/kafka-client/topics.txt`.

      - To view the logs from any container inside docker-compose use the following command, replacing `SERVICE_NAME` with the corresponding value under the **Name** column in the above table:

        ```bash
        npm run services:log -- -f SERVICE_NAME
        ```

      - If you want to modify the code of any of the services which are run inside this docker-compose file, you can stop such service inside docker-compose by command `docker-compose -f local/full/docker-compose.yml stop -f <SERVICE_NAME>` and run the service separately, following its README file.

      - We also have a minimal docker-compose which doesn't start all the required services. Use it only if are sure that you don't need all the services.

         <details><summary>Click to see details about minimal docker-compose</summary>
         <br>

         *Use this docker-compose if you only want to test and modify code of Project Service and you don't need Elasticsearch (ES) to work.*

         Run, in the project root folder:
         ```bash
         docker-compose -f local/light/docker-compose.yml up -d
         ```

         This docker-compose file starts the next services:
         |  Service | Name | Port  |
         |----------|:-----:|:----:|
         | PostgreSQL | db | 5432 |
         | Elasticsearch | esearch | 9200 |
         | Mock Service (not in use) | jsonserver | 3001  |

         </details>

   </details>

   *NOTE: In production these dependencies / services are hosted & managed outside Project Service.*

2. ♻ Init DB, ES and demo data (it clears any existent data)

   ```bash
   npm run local:init
   ```

   This command will do 3 things:
   - create Database tables (remove if exists)
   - create Elasticsearch indexes (remove if exists)
   - import demo data from `data/demo-data.json`

3. 🚀 Start Project Service

   ```bash
   npm run start:dev
   ```

   Runs the Project Service using nodemon, so it would be restarted after any of the files is updated.
   The project service will be served on `http://localhost:8001`.

4. Start Project Service Kafka Consumer

   In another terminal window run:

   ```bash
   npm run startKafkaConsumers:dev
   ```

   <details><summary>Click to learn what this service does</summary>
   <br>

   This service run Kafka Consumer which listens to some events and handles the next things:
   - updates `lastActivityAt` and `lastActivityUserId` for projects when we make any updates related to the project like updating project, project attachments, project plan, project members create/delete topics and so on
   - create/update/delete topics for phases when we create/update/delete phases
   - update phase progress and duration when milestone is completed
   - see all the Kafka handlers in file [src/events/kafkaHandlers.js](./src/events/kafkaHandlers.js)

   </details>


## Run Connect App with Project Service locally

To be able to run [Connect App](https://github.com/appirio-tech/connect-app) with the local setup of Project Service we have to do two things:
1. Configure Connect App to use locally deployed Project service inside `connect-app/config/constants/dev.js` set

   ```js
   PROJECTS_API_URL: 'http://localhost:8001'
   TC_NOTIFICATION_URL: 'http://localhost:4000/v5/notifications' # if tc-notfication-api has been locally deployed
   ```

1. Bypass token validation in Project Service.

   In `tc-project-service/node_modules/tc-core-library-js/lib/auth/verifier.js` add this to line 23:
   ```js
   callback(undefined, decodedToken.payload);
   return;
   ```
   Connect App when making requests to the Project Service uses token retrieved from the Topcoder service deployed online. Project Service validates the token. For this purpose Project Service have to know the `secret` which has been used to generate the token. But we don't know the `secret` which is used by Topcoder for both DEV and PROD environment. So to bypass token validation we change these lines in the auth library.

   *NOTE: this change only let us bypass validation during local development process*.

2. Restart both Connect App and Project Service if they were running.

## Import and Export data

### 📤 Export data

To export data to the default file `data/demo-data.json`, run:
```bash
npm run data:export
```

If you want to export data to another file, run:

```bash
npm run data:export -- --file path/to-file.json
```

- List of models that will be exported are defined in `scripts/data/dataModels.js`. You can add new models to this list, but make sure that new models are added to list such that each model comes after its dependencies.

### 📥 Import data

*During importing, data would be first imported to the database, and after from the database it would be indexed to the Elasticsearch index.*

To import data from the default file `data/demo-data.json`, run:
```bash
npm run data:import
```

If you want to import data from another file, run:

```bash
npm run data:import -- --file path/to-file.json
```

- As this commands calls topcoder services to get data like members details, so you have to provide environment variables `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_URL`, `AUTH0_AUDIENCE`, `AUTH0_PROXY_SERVER_URL`, they would automatically picked up from the `.env` file if provided.

- If you encounter conflicts errors during import, you may need to recreated database tables and Elasticssearch indexes by `npm run local:reset`.

- List of models that will be imported are defined in `scripts/data/dataModels.js`. You can add new models to this list, but make sure that new models are added to list such that each model comes after its dependencies.

## Import metadata from api.topcoder-dev.com (deprecated)

```bash
CONNECT_USER_TOKEN=<connect user token> npm run import-from-api
```
To retrieve data from DEV env we have to provide a valid user token (`CONNECT_USER_TOKEN`). You may login to http://connect.topcoder-dev.com and find the Bearer token in the request headers using browser dev tools.

This command for importing data uses API to create demo data. Which has a few pecularities:
- data in DB would be for sure created
- data in ElasticSearch Index (ES) would be only created if services [project-processor-es](https://github.com/topcoder-platform/project-processor-es) and [tc-bus-api](https://github.com/topcoder-platform/tc-bus-api) are also started locally. If you don't start them, then imported data wouldn't be indexed in ES, and would be only added to DB. You may start them locally separately, or better use `local/full/docker-compose.yml` as described [next section](#local-deployment-with-other-topcoder-services) which would start them automatically.
   - **NOTE** During data importing a lot of records has to be indexed in ES, so you have to wait about 5-10 minutes after `npm run import-from-api` is finished until imported data is indexed in ES. You may watch logs of `project-processor-es` to see if its done or no.

## Run via Docker

1. Build image
   ```bash
   docker build -t tc_projects_services .
   ```

2. Follow all the steps 1 - 4 from [steps to run locally](#steps-to-run-locally). But on the step 2 replace `dockerhost` with the IP address of the host machine from inside the docker container, see [stackoverflow](https://stackoverflow.com/questions/22944631/how-to-get-the-ip-address-of-the-docker-host-from-inside-a-docker-container).
   - For **macOS** and **Windows** on Docker 18.03+ this should work: replace `dockerhost` with `host.docker.internal`.

3. Start Project Service via Docker by:
   ```bash
   docker run -p 8001:3000 -i -t --env-file .env tc_projects_services start
   ```
   The project service will be served on http://localhost:8001.

## NPM Commands

| Command&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Description |
|--------------------|--|
| `npm run lint`     | Check for for lint errors. |
| `npm run lint:fix` | Check for for lint errors and fix error automatically when possible. |
| `npm run build`    | Build source code for production run into `dist` folder. |
| `npm run start`  | Start app in the production mode from prebuilt `dist` folder. |
| `npm run start:dev`  | Start app in the development mode using `nodemon`. |
| `npm run startKafkaConsumers`  | Start Kafka consumer app in production mode from prebuilt `dist` folder. |
| `npm run startKafkaConsumers:dev`  | Start Kafka consumer app in the development mode using `nodemon`. |
| `npm run test`  | Run tests. |
| `npm run test:watch`  | Run tests and re-run them on changes (not useful now as it re-runs all the test). |
| `npm run reset:db`  | Recreate Database schemas (removes any existent data). |
| `npm run reset:es`  | Recreate Elasticsearch indexes (removes any existent data). |
| `npm run import-from-api`  | Import Metadata from DEV environment, see [docs](#import-metadata-from-apitopcoder-devcom-deprecated). |
| `npm run es-db-compare`  | Run helper script to compare data in Database and Elasticsearch indexes, see [docs](./scripts/es-db-compare/README.md). |
| `npm run data:export`  | Export data from Database to file, see [docs](#📤-export-data) |
| `npm run data:import`  | Import data from file to Database and index it to Elasticsearch, see [docs](#📥-import-data) |
| `npm run services:up`  | Start services via docker-compose for local development. |
| `npm run services:down`  | Stop services via docker-compose for local development. |
| `npm run services:logs -- -f <service_name>`  | View logs of some service inside docker-compose. |
| `npm run local:init` | Recreate Database and Elasticsearch indexes and populate demo data for local development (removes any existent data). |
| `npm run local:reset` | Recreate Database and Elasticsearch indexes (removes any existent data). |
| `npm run babel-node-script -- <path/to/script>` | Helper command which is used by other commands to run node scripts using `babel-node` and `dotenv` so variables from `.env` file are automatically applied. |
| `npm run generate:doc:permissions` | Generate [permissions.html](docs/permissions.html) which later can be viewed by [link](https://htmlpreview.github.io/?https://github.com/topcoder-platform/tc-project-service/blob/develop/docs/permissions.html). |
| `npm run generate:doc:permissions:dev` | Generate [permissions.html](docs/permissions.html) on any changes (useful during development). |

## Kafka commands

If you've used **Full** `docker-compose` with the file `local/full/docker-compose.yml` during local setup to spawn kafka & zookeeper, you can use the following commands to manipulate kafka topics and messages:
(Replace `TOPIC_NAME` with the name of the desired topic)

### Create Topic

```bash
docker exec tc-projects-kafka /opt/kafka/bin/kafka-topics.sh --create --zookeeper zookeeper:2181 --partitions 1 --replication-factor 1 --topic TOPIC_NAME
```

### List Topics

```bash
docker exec tc-projects-kafka /opt/kafka/bin/kafka-topics.sh --list --zookeeper zookeeper:2181
```

### Watch Topic

```bash
docker exec  tc-projects-kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic TOPIC_NAME
```

### Post Message to Topic (from stdin)

```bash
docker exec -it tc-projects-kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic TOPIC_NAME
```

- Enter or copy/paste the message into the console after starting this command.

## Test
```bash
npm run test
```
Tests are being executed with the `NODE_ENV` environment variable has a value `test` and `config/test.js` configuration is loaded.

Each of the individual modules/services are unit tested.

## JWT Authentication
Authentication is handled via Authorization (Bearer) token header field. Token is a JWT token. Here is a sample token that is valid for a very long time for a user with administrator role.
```
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJhZG1pbmlzdHJhdG9yIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLWRldi5jb20iLCJoYW5kbGUiOiJwc2hhaDEiLCJleHAiOjI0NjI0OTQ2MTgsInVzZXJJZCI6IjQwMTM1OTc4IiwiaWF0IjoxNDYyNDk0MDE4LCJlbWFpbCI6InBzaGFoMUB0ZXN0LmNvbSIsImp0aSI6ImY0ZTFhNTE0LTg5ODAtNDY0MC04ZWM1LWUzNmUzMWE3ZTg0OSJ9.XuNN7tpMOXvBG1QwWRQROj7NfuUbqhkjwn39Vy4tR5I
```
It's been signed with the secret 'secret'. This secret should match your entry in config/local.js. You can generate your own token using https://jwt.io

## Documentation

- [Projects Service Architecture](./docs/guides/architercture/architecture.md)
- [Permissions Guide](https://github.com/topcoder-platform/tc-project-service/blob/develop/docs/guides/permissions-guide/permissions-guide.md) - what kind of permissions we have, how they work and how to use them.
- [Permissions](https://htmlpreview.github.io/?https://github.com/topcoder-platform/tc-project-service/blob/develop/docs/permissions.html) - the list of all permissions in Project Service.
- [Swagger API Definition](http://editor.swagger.io/?url=https://raw.githubusercontent.com/topcoder-platform/tc-project-service/develop/docs/swagger.yaml) - click to open it via Online Swagger Editor.
