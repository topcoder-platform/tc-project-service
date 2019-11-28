# Topcoder Projects Service

Microservice to manage CRUD operations for all things Projects.

### Note : Steps mentioned below are best to our capability as guide for local deployment, however, we expect from contributor, being a developer, to resolve run-time issues (e.g. OS and node version issues etc), if any.

## Local Development

### Requirements

* [docker-compose](https://docs.docker.com/compose/install/) - We use docker-compose for running dependencies locally.
* Nodejs 8.9.4 - consider using [nvm](https://github.com/creationix/nvm) or equivalent to manage your node version
* Install [libpg](https://www.npmjs.com/package/pg-native)

### Steps to run locally
1. Install node dependencies
   ```bash
   npm install
   ```

* Run docker with dependant services
  ```bash
  cd local/
  docker-compose up
  ```
  This will run several services locally:
  - `postgres` - two instances: for app and for unit tests
  - `elasticsearch`
  - `rabbitmq`
  - `mock-services` - mocks some Topcoder API

  *NOTE: In production these dependencies / services are hosted & managed outside tc-projects-service.*

* Local config

  There are two prepared configs:
  - if you have M2M environment variables provided: `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_URL`, `AUTH0_AUDIENCE`, `AUTH0_PROXY_SERVER_URL` then use `config/m2m.local.js`
  - otherwise use `config/mock.local.js`.

  To apply any of these config copy it to `config/local.js`:

  ```bash
  cp config/mock.local.js config/local.js
  # or
  cp config/m2m.local.js config/local.js
  ```

  `config/local.js` has a prepared configuration which would replace values no matter what `NODE_ENV` value is.

  **IMPORTANT** These configuration files assume that docker containers are run on domain `dockerhost`. Depend on your system you have to make sure that domain `dockerhost` points to the IP address of docker.
  For example, you can add a the next line to your `/etc/hosts` file, if docker is run on IP `127.0.0.1`.
  ```
  127.0.0.1       dockerhost
  ```
  Alternatively, you may update `config/local.js` and replace `dockerhost` with your docker IP address.<br>
  You may try using command `docker-machine ip` to get your docker IP, but it works not for all systems.
  Also, be sure to update `busApiUrl` if you are running `tc-bus-api` locally. (See below)

  Explanation of configs:
  - `config/mock.local.js` - Use local `mock-services` from docker to mock Identity and Member services instead of using deployed at Topcoder dev environment.
  - `config/m2m.local.js` - Use Identity and Member services deployed at Topcoder dev environment. This can be used only if you have M2M environment variables (`AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_URL`, `AUTH0_AUDIENCE`, `AUTH0_PROXY_SERVER_URL`) provided to access Topcoder DEV environment services.

* Create tables in DB
  ```bash
  NODE_ENV=development npm run sync:db
  ```
  This command will crate tables in `postgres` db.

  *NOTE: this will drop tables if they already exist.*

* Sync ES indices
  ```bash
  NODE_ENV=development npm run sync:es
  ```
  Helper script to sync the indices and mappings with the elasticsearch.

  *NOTE: This will first clear all the indices and than recreate them. So use with caution.*

* Run

  **NOTE** If you use `config/m2m.local.js` config, you should set M2M environment variables before running the next command.
  ```bash
  npm run start:dev
  ```
  Runs the Project Service using nodemon, so it would be restarted after any of the files is updated.
  The project service will be served on `http://localhost:8001`.

### Import sample metadata & projects
```bash
CONNECT_USER_TOKEN=<connect user token> npm run demo-data
```
This command will create sample metadata entries in the DB (duplicate what is currently in development environment).

To retrieve data from DEV env we need to provide a valid user token. You may login to http://connect.topcoder-dev.com and find the Bearer token in the request headers using browser dev tools.

### Local Deployment with other Topcoder Services.

* There exists an alternate `docker-compose.yml` file that can be used to spawn containers for the following services:

|  Service | Name | Port  |
|----------|:-----:|:----:|
| PostGreSQL DB | db | 5432  |
| ElasticSearch | esearch | 9200,9300 |
| RabbitMQ | queue | 5672, 15672  |
| Zookeeper | zookeeper | 2181  |
| Kafka | kafka | 9092  |
| [tc-bus-api](https://github.com/topcoder-platform/tc-bus-api) | tc-bus-api | 8002  |
| [project-processor-es](https://github.com/topcoder-platform/project-processor-es) | project-processor-es | 5000  |
| [tc-notifications-api](https://github.com/topcoder-platform/tc-notifications) | tc-notifications-api | 4000  |
| [tc-notifications-processor](https://github.com/topcoder-platform/tc-notifications) | tc-notifications-processor | 4001  |

* To have kafka create a list of desired topics on startup, there exists a file with the path `local/full/kafka-client/topics.txt`. Each line from the file will be added as a topic.
* To run these services simply run the following commands:

  ```bash
  export AUTH0_CLIENT_ID=<insert required value here>
  export AUTH0_CLIENT_SECRET=<insert required value here>
  export AUTH0_URL=<insert required value here>
  export AUTH0_AUDIENCE=<insert required value here>
  export AUTH0_PROXY_SERVER_URL=<insert required value here>

  cd local/full
  docker-compose up -d
  ```

* The environment variables specified in the commands above will be passed onto the containers that have been configured to read them.
* The above command will start all containers in the background.
* To view the logs of any of the services use the following command, replacing "SERVICE_NAME" with the corresponding value under the "Name" column in the above table:

  ```bash
  cd local/full
  docker-compose logs -f SERVICE_NAME
  ```

* The containers have been configured such that all Topcoder services will wait until all the topics listed in `local/full/kafka-client/topics.txt` have been created. To monitor the progress of topic creation, you can view the logs of the `kafka-client` service, which will exit when all topics have been created.

### Run Connect App with Project Service locally

To be able to run [Connect App](https://github.com/appirio-tech/connect-app) with the local setup of Project Service we have to do two things:
1. Configurate Connect App to use locally deployed Project service inside `connect-app/config/constants/dev.js` set

   ```js
   PROJECTS_API_URL: 'http://localhost:8001'
   TC_NOTIFICATION_URL: 'http://localhost:4000/v5/notifications' # if tc-notfication-api has been locally deployed
   ```

2. Bypass token validation in Project Service.

   In `tc-project-service/node_modules/tc-core-library-js/lib/auth/verifier.js` add this to line 23:
   ```js
   callback(undefined, decodedToken.payload);
   return;
   ```
   Connect App when making requests to the Project Service uses token retrieved from the Topcoder service deployed online. Project Service validates the token. For this purpose Project Service have to know the `secret` which has been used to generate the token. But we don't know the `secret` which is used by Topcoder for both DEV and PROD environment. So to bypass token validation we change these lines in the auth library.

   *NOTE: this change only let us bypass validation during local development process*.

3. Restart both Connect App and Project Service if they were running.

### Test
```bash
npm run test
```
Tests are being executed with the `NODE_ENV` environment variable has a value `test` and `config/test.js` configuration is loaded.

Each of the individual modules/services are unit tested.

#### JWT Authentication
Authentication is handled via Authorization (Bearer) token header field. Token is a JWT token. Here is a sample token that is valid for a very long time for a user with administrator role.
```
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJhZG1pbmlzdHJhdG9yIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLWRldi5jb20iLCJoYW5kbGUiOiJwc2hhaDEiLCJleHAiOjI0NjI0OTQ2MTgsInVzZXJJZCI6IjQwMTM1OTc4IiwiaWF0IjoxNDYyNDk0MDE4LCJlbWFpbCI6InBzaGFoMUB0ZXN0LmNvbSIsImp0aSI6ImY0ZTFhNTE0LTg5ODAtNDY0MC04ZWM1LWUzNmUzMWE3ZTg0OSJ9.XuNN7tpMOXvBG1QwWRQROj7NfuUbqhkjwn39Vy4tR5I
```
It's been signed with the secret 'secret'. This secret should match your entry in config/local.js. You can generate your own token using https://jwt.io

### Local Deployment

**NOTE: This part of README may contain inconsistencies and requires update. Don't follow it unless you know how to properly make configuration for these steps. It's not needed for regular development process.**

Build image:
`docker build -t tc_projects_services .`
Run image:
`docker run -p 3000:3000 -i -t -e DB_HOST=172.17.0.1 tc_projects_services`
You may replace 172.17.0.1 with your docker0 IP.

You can paste **swagger.yaml** to  [swagger editor](http://editor.swagger.io/) or import **postman.json** and **postman_environment.json** to verify endpoints.

#### Deploying without docker
If you don't want to use docker to deploy to localhost. You can simply run `npm run start:dev` from root of project. This should start the server on default port `8001`.

### Kafka Commands

If you've used `docker-compose` with the file `local/full/docker-compose.yml` to spawn kafka & zookeeper, you can use the following commands to manipulate kafka topics and messages:
(Replace TOPIC_NAME with the name of the desired topic)

**Create Topic**

```bash
docker exec tc-projects-kafka /usr/bin/kafka-topics --create --zookeeper zookeeper:2181 --partitions 1 --replication-factor 1 --topic TOPIC_NAME
```

**List Topics**

```bash
docker exec -it tc-projects-kafka /usr/bin/kafka-topics --list --zookeeper zookeeper:2181
```

**Watch Topic**

```bash
docker exec -it tc-projects-kafka /usr/bin/kafka-console-consumer --bootstrap-server localhost:9092 --zookeeper zookeeper:2181 --topic TOPIC_NAME
```

**Post Message to Topic**

```bash
docker exec -it tc-projects-kafka /usr/bin/kafka-console-producer --topic TOPIC_NAME --broker-list localhost:9092
```
The message can be passed using `stdin`
