#!/usr/bin/env bash

# more bash-friendly output for jq
JQ="jq --raw-output --exit-status"

ENV=$1
COUNTER_LIMIT=20
#ACCOUNT_ID=$(eval "echo \$${ENV}_AWS_ACCOUNT_ID")
#AWS_REGION=$(eval "echo \$${ENV}_AWS_REGION")
AWS_ECS_CONTAINER_NAME="tc-project-service"
AWS_REPOSITORY=$(eval "echo \$${ENV}_AWS_REPOSITORY")
AWS_ECS_CLUSTER=$(eval "echo \$${ENV}_AWS_ECS_CLUSTER")
AWS_ECS_SERVICE=$(eval "echo \$${ENV}_AWS_ECS_SERVICE")
AWS_ECS_SERVICE_CONSUMERS=$(eval "echo \$${ENV}_AWS_ECS_SERVICE_CONSUMERS")
AUTH_DOMAIN=$(eval "echo \$${ENV}_AUTH_DOMAIN")
AUTH_SECRET=$(eval "echo \$${ENV}_AUTH_SECRET")
VALID_ISSUERS=$(eval "echo \$${ENV}_VALID_ISSUERS")
PORT=3000
family="tc-project-service"

# configures aws cli for further usage
configure_aws_cli() {
  export AWS_ACCESS_KEY_ID=$(eval "echo \$${ENV}_AWS_ACCESS_KEY_ID")
  export AWS_SECRET_ACCESS_KEY=$(eval "echo \$${ENV}_AWS_SECRET_ACCESS_KEY")
  aws --version
  aws configure set default.region $AWS_REGION
  aws configure set default.output json
}

# deploys the app to the ecs cluster
deploy_cluster() {

    make_task_def $1 $2 $3 $4
    register_definition $1
    if [[ $(aws ecs update-service --cluster $AWS_ECS_CLUSTER --service $1 --task-definition $revision | \
                   $JQ '.service.taskDefinition') != $revision ]]; then
        echo "Error updating service."
        return 1
    fi

    echo "Deployed!"
    return 0
}

make_task_def(){
  task_template='{
   "family": "%s",
   "requiresCompatibilities": ["EC2", "FARGATE"],
   "networkMode": "awsvpc",
   "taskRoleArn": "arn:aws:iam::%s:role/tc-project-service-ecs-task-role",
   "executionRoleArn": "arn:aws:iam::%s:role/ecsTaskExecutionRole",
   "cpu": "1024",
   "memory": "2048",
   "containerDefinitions": [
    {
      "name": "%s",
      "image": "%s.dkr.ecr.%s.amazonaws.com/%s:%s",
      "essential": true,
      "memory": 1536,
      "cpu": 768,
      "entryPoint": ["%s", "%s", "%s"],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "%s"
        },
        {
          "name": "ENABLE_FILE_UPLOAD",
          "value": "%s"
        },
        {
          "name": "LOG_LEVEL",
          "value": "%s"
        },
        {
          "name": "CAPTURE_LOGS",
          "value": "%s"
        },
        {
          "name": "LOGENTRIES_TOKEN",
          "value": "%s"
        },
        {
          "name": "API_VERSION",
          "value": "%s"
        },
        {
          "name": "AWS_REGION",
          "value": "%s"
        },
        {
          "name": "AUTH_DOMAIN",
          "value": "%s"
        },
        {
          "name": "AUTH_SECRET",
          "value": "%s"
        },
        {
          "name": "VALID_ISSUERS",
          "value": "%s"
        },
        {
          "name": "DB_MASTER_URL",
          "value": "%s"
        },
        {
          "name": "MEMBER_SERVICE_ENDPOINT",
          "value": "%s"
        },
        {
          "name": "IDENTITY_SERVICE_ENDPOINT",
          "value": "%s"
        },
        {
          "name": "BUS_API_URL",
          "value": "%s"
        },
        {
          "name": "MESSAGE_SERVICE_URL",
          "value": "%s"
        },
        {
          "name": "SYSTEM_USER_CLIENT_ID",
          "value": "%s"
        },
        {
          "name": "SYSTEM_USER_CLIENT_SECRET",
          "value": "%s"
        },
        {
          "name": "PROJECTS_ES_URL",
          "value": "%s"
        },
        {
          "name": "PROJECTS_ES_INDEX_NAME",
          "value": "%s"
        },
        {
          "name": "DIRECT_PROJECT_SERVICE_ENDPOINT",
          "value": "%s"
        },
        {
          "name": "FILE_SERVICE_ENDPOINT",
          "value": "%s"
        },
        {
          "name": "CONNECT_PROJECTS_URL",
          "value": "%s"
        },
        {
          "name": "CONNECT_URL",
          "value": "%s"
        },
        {
          "name": "ACCOUNTS_APP_URL",
          "value": "%s"
        },
        {
          "name": "SEGMENT_ANALYTICS_KEY",
          "value": "%s"
        },
        {
          "name": "AUTH0_URL",
          "value": "%s"
        },
        {
          "name": "AUTH0_AUDIENCE",
          "value": "%s"
        },
        {
          "name": "AUTH0_CLIENT_ID",
          "value": "%s"
        },
        {
          "name": "AUTH0_CLIENT_SECRET",
          "value": "%s"
        },
        {
          "name": "TOKEN_CACHE_TIME",
          "value": "%s"
        },
        {
          "name": "KAFKA_CLIENT_CERT",
          "value": "%s"
        },
        {
          "name": "KAFKA_CLIENT_CERT_KEY",
          "value": "%s"
        },
        {
          "name": "KAFKA_GROUP_ID",
          "value": "%s"
        },
        {
          "name": "KAFKA_URL",
          "value": "%s"
        },
        {
          "name": "AUTH0_PROXY_SERVER_URL",
          "value": "%s"
        },
        {
          "name": "EMAIL_INVITE_FROM_NAME",
          "value": "%s"
        },
        {
          "name": "EMAIL_INVITE_FROM_EMAIL",
          "value": "%s"
        },
        {
          "name": "INVITE_EMAIL_SUBJECT",
          "value": "%s"
        },
        {
          "name": "INVITE_EMAIL_SECTION_TITLE",
          "value": "%s"
        }
      ],
      "portMappings": [
        {
          "hostPort": %s,
          "protocol": "tcp",
          "containerPort": %s
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/aws/ecs/%s",
          "awslogs-region": "%s",
          "awslogs-stream-prefix": "%s"
        }
      }
    }
  ]}'
  API_VERSION=$(eval "echo \$${ENV}_API_VERSION")
  DB_MASTER_URL=$(eval "echo \$${ENV}_DB_MASTER_URL")
  MEMBER_SERVICE_ENDPOINT=$(eval "echo \$${ENV}_MEMBER_SERVICE_ENDPOINT")
  IDENTITY_SERVICE_ENDPOINT=$(eval "echo \$${ENV}_IDENTITY_SERVICE_ENDPOINT")
  BUS_API_URL=$(eval "echo \$${ENV}_BUS_API_URL")
  SYSTEM_USER_CLIENT_ID=$(eval "echo \$${ENV}_SYSTEM_USER_CLIENT_ID")
  SYSTEM_USER_CLIENT_SECRET=$(eval "echo \$${ENV}_SYSTEM_USER_CLIENT_SECRET")
  CAPTURE_LOGS=$(eval "echo \$${ENV}_CAPTURE_LOGS")
  LOGENTRIES_TOKEN=$(eval "echo \$${ENV}_LOGENTRIES_TOKEN")
  LOG_LEVEL=$(eval "echo \$${ENV}_LOG_LEVEL")
  PROJECTS_ES_URL=$(eval "echo \$${ENV}_PROJECTS_ES_URL")
  PROJECTS_ES_INDEX_NAME=$(eval "echo \$${ENV}_PROJECTS_ES_INDEX_NAME")
  DIRECT_PROJECT_SERVICE_ENDPOINT=$(eval "echo \$${ENV}_DIRECT_PROJECT_SERVICE_ENDPOINT")
  FILE_SERVICE_ENDPOINT=$(eval "echo \$${ENV}_FILE_SERVICE_ENDPOINT")
  CONNECT_PROJECTS_URL=$(eval "echo \$${ENV}_CONNECT_PROJECTS_URL")
  CONNECT_URL=$(eval "echo \$${ENV}_CONNECT_URL")
  ACCOUNTS_APP_URL=$(eval "echo \$${ENV}_ACCOUNTS_APP_URL")
  SEGMENT_ANALYTICS_KEY=$(eval "echo \$${ENV}_SEGMENT_ANALYTICS_KEY")
  MESSAGE_SERVICE_URL=$(eval "echo \$${ENV}_MESSAGE_SERVICE_URL")
  if [ "$ENV" = "PROD" ]; then
    NODE_ENV=production
  elif [ "$ENV" = "DEV" ]; then
    NODE_ENV=development
  fi
  echo "NODE_ENV"
  echo $NODE_ENV
  ENABLE_FILE_UPLOAD=$(eval "echo \$${ENV}_ENABLE_FILE_UPLOAD")

  AUTH0_URL=$(eval "echo \$${ENV}_AUTH0_URL")
  AUTH0_AUDIENCE=$(eval "echo \$${ENV}_AUTH0_AUDIENCE")
  AUTH0_CLIENT_ID=$(eval "echo \$${ENV}_AUTH0_CLIENT_ID")
  AUTH0_CLIENT_SECRET=$(eval "echo \$${ENV}_AUTH0_CLIENT_SECRET")
  TOKEN_CACHE_TIME=$(eval "echo \$${ENV}_TOKEN_CACHE_TIME")
  KAFKA_CLIENT_CERT=$(eval "echo \$${ENV}_KAFKA_CLIENT_CERT")
  KAFKA_CLIENT_CERT_KEY=$(eval "echo \$${ENV}_KAFKA_CLIENT_CERT_KEY")
  KAFKA_GROUP_ID=$(eval "echo \$${ENV}_KAFKA_GROUP_ID")
  KAFKA_URL=$(eval "echo \$${ENV}_KAFKA_URL")

  AUTH0_PROXY_SERVER_URL=$(eval "echo \$${ENV}_AUTH0_PROXY_SERVER_URL")
  EMAIL_INVITE_FROM_NAME=$(eval "echo \$${ENV}_EMAIL_INVITE_FROM_NAME")
  EMAIL_INVITE_FROM_EMAIL=$(eval "echo \$${ENV}_EMAIL_INVITE_FROM_EMAIL")
  INVITE_EMAIL_SUBJECT=$(eval "echo \$${ENV}_INVITE_EMAIL_SUBJECT")
  INVITE_EMAIL_SECTION_TITLE=$(eval "echo \$${ENV}_INVITE_EMAIL_SECTION_TITLE")

  task_def=$(printf "$task_template" $1 $AWS_ACCOUNT_ID $AWS_ACCOUNT_ID $AWS_ECS_CONTAINER_NAME $AWS_ACCOUNT_ID $AWS_REGION $AWS_REPOSITORY $CIRCLE_SHA1 $2 $3 $4 $NODE_ENV $ENABLE_FILE_UPLOAD $LOG_LEVEL $CAPTURE_LOGS $LOGENTRIES_TOKEN $API_VERSION $AWS_REGION $AUTH_DOMAIN $AUTH_SECRET $VALID_ISSUERS $DB_MASTER_URL $MEMBER_SERVICE_ENDPOINT $IDENTITY_SERVICE_ENDPOINT $BUS_API_URL $MESSAGE_SERVICE_URL $SYSTEM_USER_CLIENT_ID $SYSTEM_USER_CLIENT_SECRET $PROJECTS_ES_URL $PROJECTS_ES_INDEX_NAME $DIRECT_PROJECT_SERVICE_ENDPOINT $FILE_SERVICE_ENDPOINT $CONNECT_PROJECTS_URL $CONNECT_URL $ACCOUNTS_APP_URL $SEGMENT_ANALYTICS_KEY "$AUTH0_URL" "$AUTH0_AUDIENCE" $AUTH0_CLIENT_ID "$AUTH0_CLIENT_SECRET" $TOKEN_CACHE_TIME "$KAFKA_CLIENT_CERT" "$KAFKA_CLIENT_CERT_KEY" $KAFKA_GROUP_ID $KAFKA_URL "$AUTH0_PROXY_SERVER_URL" "$EMAIL_INVITE_FROM_NAME" "$EMAIL_INVITE_FROM_EMAIL" "$INVITE_EMAIL_SUBJECT" "$INVITE_EMAIL_SECTION_TITLE" $PORT $PORT $AWS_ECS_CLUSTER $AWS_REGION $NODE_ENV)
}

push_ecr_image(){
  eval $(aws ecr get-login --region $AWS_REGION --no-include-email)
  docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$1:$CIRCLE_SHA1
}

register_definition() {
    if revision=$(aws ecs register-task-definition --cli-input-json "$task_def" 2> /dev/null | $JQ '.taskDefinition.taskDefinitionArn'); then
        echo "Revision: $revision"
    else
        echo "Failed to register task definition"
        return 1
    fi
}

check_service_status() {
        counter=0
  sleep 60
        servicestatus=`aws ecs describe-services --service $1 --cluster $AWS_ECS_CLUSTER | $JQ '.services[].events[0].message'`
        while [[ $servicestatus != *"steady state"* ]]
        do
           echo "Current event message : $servicestatus"
           echo "Waiting for 30 seconds to check the service status...."
           sleep 30
           servicestatus=`aws ecs describe-services --service $1 --cluster $AWS_ECS_CLUSTER | $JQ '.services[].events[0].message'`
           counter=`expr $counter + 1`
           if [[ $counter -gt $COUNTER_LIMIT ]] ; then
                echo "Service does not reach steady state within 10 minutes. Please check"
                exit 1
           fi
        done
        echo "$servicestatus"
}

#configure_aws_cli
push_ecr_image $AWS_REPOSITORY
deploy_cluster $AWS_ECS_SERVICE "npm" "run" "start"

deploy_cluster $AWS_ECS_SERVICE_CONSUMERS "npm" "run" "startKafkaConsumers"

check_service_status $AWS_ECS_SERVICE
check_service_status $AWS_ECS_SERVICE_CONSUMERS
