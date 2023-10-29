FROM debian:11.6
ENV NVM_VERSION=v0.39.3
ENV NODE_VERSION=12.16.1
RUN apt update
RUN apt install -y \
    gnupg curl wget netbase procps git \
    apt-transport-https ca-certificates openssh-client \
    python3-pip
RUN apt install -y \
    yarn \
    libpq-dev   
RUN pip3 install awscli     
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN node --version
RUN npm --version
# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app
# Install app dependencies
RUN npm install
RUN npm run -s build

EXPOSE 3000

ENTRYPOINT ["npm","run"]
#CMD ["npm", "start"]
