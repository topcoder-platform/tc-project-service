#!/bin/bash

while read topic; do
  /usr/bin/kafka-topics --create --zookeeper zookeeper:2181 --partitions 1 --replication-factor 1 --topic $topic
done < topics.txt
