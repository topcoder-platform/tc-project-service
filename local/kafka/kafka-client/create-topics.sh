#!/bin/bash

while read topic; do
  /opt/kafka/bin/kafka-topics.sh --create --zookeeper zookeeper:2181 --partitions 1 --replication-factor 1 --topic $topic
done < topics.txt
