#!/bin/bash

SERVICE=$1
ENV=$2
TAG_SUFFIX=$3
TAG="$ENV.$TAG_SUFFIX"


echo "Deploying to Elasticbeanstalk"
echo "############################"
export AWS_ACCESS_KEY_ID=$(eval "echo \$${ENV}_AWS_ACCESS_KEY_ID")
export AWS_SECRET_ACCESS_KEY=$(eval "echo \$${ENV}_AWS_SECRET_ACCESS_KEY")

# eb deploy
eb init -r us-east-1 $SERVICE
EB_OUTPUT="$(eb deploy -l $TAG -r us-east-1)"

echo $EB_OUTPUT
if echo $EB_OUTPUT | grep -iq error; then
 exit 1
fi
exit 0
