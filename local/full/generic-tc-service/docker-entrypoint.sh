#!/bin/bash

HOST_DOMAIN="host.docker.internal"
ping -q -c1 $HOST_DOMAIN > /dev/null 2>&1
if [ $? -ne 0 ]; then
  HOST_IP=$(ip route | awk 'NR==1 {print $3}')
  echo -e "$HOST_IP\t$HOST_DOMAIN" >> /etc/hosts
fi

if [ $# -eq 2 ]; then
  echo "Waiting for $2 to exit...."
  while ping -c1 $2 &>/dev/null
    do
      sleep 1
    done
  echo "$2 exited!"
fi

cd /opt/app/ && npm run $1
