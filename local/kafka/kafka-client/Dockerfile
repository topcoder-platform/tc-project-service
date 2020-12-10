From wurstmeister/kafka
WORKDIR /app/
COPY topics.txt .
COPY create-topics.sh .
RUN chmod +x create-topics.sh
ENTRYPOINT ["/app/create-topics.sh"]
