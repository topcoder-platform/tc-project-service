ARG NODE_VERSION=8.11.3

FROM node:$NODE_VERSION
ARG GIT_URL
ARG GIT_BRANCH
ARG BYPASS_TOKEN_VALIDATION

RUN git clone $GIT_URL /opt/app
WORKDIR /opt/app
RUN git checkout -b node-branch origin/$GIT_BRANCH

RUN npm install
RUN if [ $BYPASS_TOKEN_VALIDATION -eq 1 ]; then sed -i '/decodedToken = jwt.decode/a \      callback(undefined, decodedToken.payload); return;' node_modules/tc-core-library-js/lib/auth/verifier.js; fi
COPY docker-entrypoint.sh /opt/
ENTRYPOINT ["/opt/docker-entrypoint.sh"]
