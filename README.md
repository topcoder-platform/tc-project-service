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
  - `postgres`
  - `elasticsearch`
  - `rabbitmq`
  - `mock-services` - mocks some Topcoder API

  *NOTE: In production these dependencies / services are hosted & managed outside tc-projects-service.*

* Local config
  ```bash
  # in the tc-project-service root folder, not inside local/ as above
  cp config/sample.local.js config/local.js
  ```
  Copy `config/sample.local.js` as `config/local.js`.<br>
  As project service depend on many third-party services we have to config how to access them.  Some services are run locally and some services are used from Topcoder DEV environment. `config/local.js` has a prepared configuration which would replace values no matter what `NODE_ENV` value is.

  **IMPORTANT** This configuration file assumes that services run by docker use domain `dockerhost`. Depend on your system you have to make sure that domain `dockerhost` points to the IP address of docker.
  For example, you can add a the next line to your `/etc/hosts` file, if docker is run on IP `127.0.0.1`.
  ```
  127.0.0.1       dockerhost
  ```
  Alternatively, you may update `config/local.js` and replace `dockerhost` with your docker IP address.<br>
  You may try using command `docker-machine ip` to get your docker IP, but it works not for all systems.

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
  ```bash
  npm run start:dev
  ```
  Runs the Project Service using nodemon, so it would be restarted after any of the files is updated.
  The project service will be served on `http://localhost:8001`.

### Import sample metadata
```bash
node migrations/seedMetadata.js
```
To create sample metadata entries (duplicate what is currently in development environment).

### Run Connect App with Project Service locally

To be able to run [Connect App](https://github.com/appirio-tech/connect-app) with the local setup of Project Service we have to do two things:
1. Configurate Connect App to use locally deployed Project service inside `connect-app/config/constants/dev.js` set

   ```js
   PROJECTS_API_URL: 'http://localhost:8001'
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

Each of the individual modules/services are unit tested.

To run unit tests run `npm run test` from root of project.

While tests are being executed the `NODE_ENV` environment variable has a value `test` and `config/test.js` configuration is loaded. The default test configuration refers to `projectsdb_test` postgres database. So make sure that this database exists before running the tests. Since we are using docker-compose for local deployment change `local/docker-compose.yaml` postgres service with updated database name and re-create the containers.

```
// stop already executing containers if any
docker-compose stop -t 1
// clear the containers
docker-compose rm -f
// re-run the services with build flag
docker-compose up --build
```

#### JWT Authentication
Authentication is handled via Authorization (Bearer) token header field. Token is a JWT token. Here is a sample token that is valid for a very long time for a user with administrator role.
```
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJhZG1pbmlzdHJhdG9yIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLWRldi5jb20iLCJoYW5kbGUiOiJwc2hhaDEiLCJleHAiOjI0NjI0OTQ2MTgsInVzZXJJZCI6IjQwMTM1OTc4IiwiaWF0IjoxNDYyNDk0MDE4LCJlbWFpbCI6InBzaGFoMUB0ZXN0LmNvbSIsImp0aSI6ImY0ZTFhNTE0LTg5ODAtNDY0MC04ZWM1LWUzNmUzMWE3ZTg0OSJ9.XuNN7tpMOXvBG1QwWRQROj7NfuUbqhkjwn39Vy4tR5I
```
It's been signed with the secret 'secret'. This secret should match your entry in config/local.js. You can generate your own token using https://jwt.io

### Local Deployment
Build image:
`docker build -t tc_projects_services .`
Run image:
`docker run -p 3000:3000 -i -t -e DB_HOST=172.17.0.1 tc_projects_services`
You may replace 172.17.0.1 with your docker0 IP.

You can paste **swagger.yaml** to  [swagger editor](http://editor.swagger.io/) or import **postman.json** and **postman_environment.json** to verify endpoints.

#### Deploying without docker
If you don't want to use docker to deploy to localhost. You can simply run `npm run start:dev` from root of project. This should start the server on default port `8001`.
