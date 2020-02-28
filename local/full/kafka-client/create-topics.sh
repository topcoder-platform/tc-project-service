#!/bin/bash

/opt/kafka/bin/kafka-topics.sh --list --zookeeper zookeeper:2181 > exists-topics.txt
while read topic; do
  /opt/kafka/bin/kafka-topics.sh --create --if-not-exists --zookeeper zookeeper:2181 --partitions 1 --replication-factor 1 --topic $topic
done < <(sort topics.txt exists-topics.txt exists-topics.txt | uniq -u)
