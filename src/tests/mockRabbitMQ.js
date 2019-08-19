/**
 * Mock RabbitMQ service
 */
/* globals Promise */

import sinon from 'sinon';
import _ from 'lodash';

module.exports = (app) => {
  _.assign(app.services, {
    pubsub: {
      init: () => {},
      publish: () => {},
    },
  });
  sinon.stub(app.services.pubsub, 'init', () => Promise.resolve(true));
  sinon.stub(app.services.pubsub, 'publish', () => Promise.resolve(true));
};
