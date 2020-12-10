FROM node

WORKDIR /json-server

COPY services.json /json-server/
COPY package.json /json-server/
COPY server.js /json-server/
COPY authMiddleware.js /json-server/

RUN npm install

CMD ["npm", "run", "start"]

EXPOSE 3001
