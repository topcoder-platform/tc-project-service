FROM node:6.9.4
LABEL version="1.0"
LABEL description="Projects microservice"

RUN apt-get update && \
    apt-get upgrade -y

# install aws
RUN apt-get install -y \
    ssh \
    python \
    python-dev \
    python-pip

RUN pip install awscli

RUN apt-get install libpq-dev
# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app
# Install app dependencies
RUN npm install

EXPOSE 3000

CMD ["npm", "start"]
