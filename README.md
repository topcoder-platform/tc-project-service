# Topcoder Projects Service

Microservice to manage CRUD operations for all things Projects.

### Local Development
* We use docker-compose for running dependencies locally. Instructions for Docker compose setup - https://docs.docker.com/compose/install/
* Nodejs 6.9.4 - consider using [nvm](https://github.com/creationix/nvm) or equivalent to manage your node version
* Install [libpg](https://www.npmjs.com/package/pg-native)
* Install node dependencies
`npm install`

* Start local services
```~/Projects/tc-projects-service
> cd local/
~/Projects/tc-projects-service/local
> docker-compose up
```
Copy config/sample.local.js as config/local.js, update the properties and according to your env setup

#### Database
Once you start your PostgreSQL database through docker, it will create a projectsDB.
*To create tables - note this will drop tables if they already exist*
```
NODE_ENV=development npm run sync:db
```

#### Redis
Docker compose command will start a local redis instance as well. You should be able to connect to this instance using url `$(docker-machine ip):6379`

#### Elasticsearch
Docker compose includes elasticsearch instance as well. It will open ports 9200 & 9300 (kibana)

#### Sync indices and mappings

There is a helper script to sync the indices and mappings with the elasticsearch.

Run `npm run sync:es` from the root of project to execute the script.

> NOTE: This will first clear all the indices and than recreate them. So use with caution.

**NOTE**: In production these dependencies / services are hosted & managed outside tc-projects-service.

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
It's been signed with the secret 'secret'. This secret should match your entry in config/local.json. You can generate your own token using https://jwt.io

### Local Deployment
Build image:
`docker build -t tc_projects_services .`
Run image:
`docker run -p 3000:3000 -i -t -e DB_HOST=172.17.0.1 tc_projects_services`
You may replace 172.17.0.1 with your docker0 IP.

You can paste **swagger.yaml** to  [swagger editor](http://editor.swagger.io/) or import **postman.json** to verify endpoints.

#### Deploying without docker
If you don't want to use docker to deploy to localhost. You can simply run `npm run start` from root of project. This should start the server on default port `3000`.
