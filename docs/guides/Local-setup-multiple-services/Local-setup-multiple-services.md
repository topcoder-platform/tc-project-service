# Local Setup with Multiple Services

> **NOTE** This guide is adapted for Linux and macOS, if you run it on Windows you would have to adapt it by yourself.

If you want to change the code only of **Topcoder Project Service** (`tc-project-service`), it's enough to use the main [README](../../../README.md).

Follow this guide in case you want to change the code of **Topcoder Project Service** (`tc-project-service`) **together** with the code of one of the next services:
- [project-processor-es](https://github.com/topcoder-platform/project-processor-es)
- [legacy-project-processor](https://github.com/topcoder-platform/legacy-project-processor)
- [tc-notifications](https://github.com/topcoder-platform/tc-notifications)
- [tc-bus-api](https://github.com/topcoder-platform/tc-bus-api)

## How it works

To communicate with any of the next services `tc-notifications`, `project-processor-es`, `legacy-project-processor` **Project Service** sends Kafka events and these service listen to the Kafka events do some stuff. **Project Service** don't send Kafka events directly, but uses a special service to send Kafka events called `tc-bus-api`. So no matter what service we want to update, first we have to setup Kafka with Zookeeper and `tc-bus-api`.

![diagram](./images/diagram.svg)

*This diagram shows just some part of relations and services that are important for this guide, it doesn't show all of them.*

### Elasticsearch indexing

It's important to keep in mind how the indexing and reading data from Elasticsearch works.

#### Read data

Endpoints in **Project Service** should get data from the Elasticsearch index first. If no data is found, endpoints should try to get data from Database.

#### Write data

When some data is updated by **Project Service** it's directly changed in the Database. But **Project Service** doesn't change data in Elasticsearch directly. Instead of that, when some data is changed **Project Service** sends event to the Kafka (using `tc-bus-api`), and `project-processor-es` listens to the Kafka event and index updated data in Elasticsearch for **Project Service**.
As a consequences, data in Elasticsearch is not updated immediately.

## Steps to run locally

To run **Project Service** with any of the services above we has to setup Zookeper + Kafka + [tc-bus-api](https://github.com/topcoder-platform/tc-bus-api) first to produce and receive Kafka events.

### 1. Run Kafka + Zookeeper + create topics

  Clone [tc-project-service](https://github.com/topcoder-platform/tc-project-service) repository and run inside the `tc-project-service` folder:

   ```bash
   cd local/kafka
   docker-compose up
   ```

   Wait until you see in the log `kafka_kafka-client_1 exited with code 0`. `kafka-client` would create all required topics. You may also make sure that all [required topics](../../../local/kafka/kafka-client/topics.txt) are created by running the next command to list all the topics:

   ```bash
   docker exec tc-common-kafka /opt/kafka/bin/kafka-topics.sh --list --zookeeper zookeeper:2181
   ```

### 2. Run `tc-bus-api`

Clone [tc-bus-api](https://github.com/topcoder-platform/tc-bus-api) repository. And see its [README](https://github.com/topcoder-platform/tc-bus-api/blob/dev/README.md) for details on how to run it.

Mostly you have to do the next steps inside `tc-bus-api` folder:

1. `npm install`

2. To bypass token validation locally update `/node_modules/tc-core-library-js/lib/auth/verifier.js` manually and add this to line 23: `callback(undefined, decodedToken.payload); return;`.

3. Set the next env mandatory environment variables:

   ```bash
   export KAFKA_URL=localhost:9092
   export JWT_TOKEN_SECRET=secret
   export VALID_ISSUERS="[\"https:\/\/topcoder-newauth.auth0.com\/\",\"https:\/\/api.topcoder-dev.com\"]"
   ```

4. `PORT=8002 npm start`

### 3. Run Project Service

To run **Project Service**, please, follow its README section "[Steps to run locally](../../../README.md#steps-to-run-locally)".

*Note, that during "Steps to run locally" you would use `local/docker-compose.yml` with a part of services, not the `local/full/docker-compose.yml` with all the services as we are starting them separately in this guide.*

| **Optional** |
|--|
| Then next services are optional and you may start them only if need to change them or to test. |

### 4. Run `project-processor-es` (optional)

To run `project-processor-es`, please, follow its README section "[Local setup](https://github.com/topcoder-platform/project-processor-es#local-setup)", but **skip** the second step "Run docker compose with dependant services" as we already run the same docker in this guide.

### 5. Run `tc-notifications` (optional)

Clone [tc-notifications](https://github.com/topcoder-platform/tc-notifications) repository. You would have to start 2 services to make the Notification service fully work.

1. `npm install`

2. To bypass token validation locally update `/node_modules/tc-core-library-js/lib/auth/verifier.js` manually and add this to line 23: `callback(undefined, decodedToken.payload); return;`.

3. Create `tc_notifications` database inside the PostgreSQL service that we run with by **Project Service** `local/docker-compose.yml`:

   ```bash
   PGPASSWORD=mysecretpassword psql -h localhost -p 5432 -U coder -d projectsdb -c 'CREATE DATABASE tc_notifications;'
   ```

4. In two separate terminal windows set the same environment variables:

    ```bash
    export AUTH0_CLIENT_ID=<insert required value here>
    export AUTH0_CLIENT_SECRET=<insert required value here>
    export AUTH0_URL=<insert required value here>
    export AUTH0_AUDIENCE=<insert required value here>
    export AUTH0_PROXY_SERVER_URL=<insert required value here>
    export AUTH_SECRET=secret
    export VALID_ISSUERS="[\"https:\/\/topcoder-newauth.auth0.com\/\",\"https:\/\/api.topcoder-dev.com\"]"
    export TC_API_V5_BASE_URL=http://localhost:8001/v5
    export TC_API_V4_BASE_URL=https://api.topcoder-dev.com/v4
    export TC_API_V3_BASE_URL=https://api.topcoder-dev.com/v3
    export KAFKA_URL=localhost:9092
    export DATABASE_URL=postgresql://coder:mysecretpassword@localhost:5432/tc_notifications
    export JWKS_URI=test
    export LOG_LEVEL=debug
    export ENV=development
    ```

5. In one terminal window:
   - Init DB: `npm run reset:db`
   - Run `PORT=4000 npm run startAPI` - API of Notifications Service

6. In another terminal window:
   - Run `PORT=4001 npm run start` - Processor of Kafka events

### 6. Run Connect App (optional)

You may also run [Connect App](https://github.com/appirio-tech/connect-app) locally together with the current setup. Please, follow section "[Run Connect App with Project Service locally](../../../README.md#run-connect-app-with-project-service-locally)".