FROM node

WORKDIR /json-server

RUN npm install -g json-server

COPY services.json /json-server/

COPY authMiddleware.js /json-server/

CMD ["json-server", "-p 3001", "services.json", "-m", "authMiddleware.js"]

EXPOSE 3001
