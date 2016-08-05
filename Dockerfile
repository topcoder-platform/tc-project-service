FROM node:5.10.1
LABEL version="1.0"
LABEL description="Projects microservice"

RUN apt-get update && \
    apt-get upgrade -y

# install aws
RUN apt-get install -y \
    ssh \
    python \
    python-pip

RUN pip install awscli

RUN apt-get install libpq-dev
# Create app directory

RUN mkdir -p /usr/src/app

# Bundle app source
COPY src /usr/src/app/src
COPY config /usr/src/app/config
COPY node_modules /usr/src/app/node_modules
COPY package.json /usr/src/app/
COPY .babelrc /usr/src/app/
COPY newrelic.js /usr/src/app/
COPY README.md /usr/src/app/

WORKDIR /usr/src/app

EXPOSE 3000

CMD ["npm", "start"]
