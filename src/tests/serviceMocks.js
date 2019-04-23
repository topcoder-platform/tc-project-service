
/* globals Promise */

import sinon from 'sinon';
import _ from 'lodash';
// we do need to test elasticsearch indexing
import config from 'config';
import elasticsearch from 'elasticsearch';
import util from '../util';

module.exports = (app) => {
  _.assign(app.services, {
    pubsub: {
      init: () => {},
      publish: () => {},
    },
    es: new elasticsearch.Client(_.cloneDeep(config.elasticsearchConfig)),
  });
  sinon.stub(app.services.pubsub, 'init', () => Promise.resolve(true));
  sinon.stub(app.services.pubsub, 'publish', () => Promise.resolve(true));
  sinon.stub(util, 'getM2MToken', () => Promise.resolve('MOCK_TOKEN'));
};
