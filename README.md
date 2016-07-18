#Topcoder Projects Service

Microservice to manage CRUD operations for all things Tags.

### Local Development
* We use docker-compose for running dependencies locally. Instructions for Docker compose setup - https://docs.docker.com/compose/install/
* Nodejs 5.10.1 - consider using [nvm](https://github.com/creationix/nvm) or equivalent to manage your node version
* Install [libpg](https://www.npmjs.com/package/pg-native)
* Install node dependencies
`npm install | ./node_modules/.bin/bunyan`

* Start local services
```~/Projects/tc-projects-service
> cd local/
~/Projects/tc-projects-service/local
> docker-compose up
```

#### Database
Once you start your PostgreSQL database through docker, it will create a projectsDB.
*To create tables - note this will drop tables if they already exist*
```
> ENVIRONMENT=development node -e "require('./app/models').sequelize.sync({force: true}).then((res)=> console.log('Success: ', res)).catch((err)=> console.log('Failed: ', err));"
```

#### Redis
Docker compose command will start a local redis instance as well. You should be able to connect to this instance using url `$(docker-machine ip):6379`

#### Elasticsearch
Docker compose includes elasticsearch instance as well. It will open ports 9200 & 9300 (kibana)
When creating the projects index, use the mapping provided in the local folder 'projects-es-mappings.json'
`curl -XPUT --data @./local/projects-es-mappings.json http://dockerhost:9200/projects/`

**NOTE**: In production these dependencies / services are hosted & managed outside tc-projects-service.

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

### Deployment
Using awsebcli - http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html
