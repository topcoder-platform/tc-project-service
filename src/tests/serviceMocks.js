
/* globals Promise */

import sinon from 'sinon';
import _ from 'lodash';
// we do need to test elasticsearch indexing
import config from 'config';
import elasticsearch from 'elasticsearch';

module.exports = (app) => {
  _.assign(app.services, {
    pubsub: {
      publish: () => {},
    },
    es: new elasticsearch.Client(_.cloneDeep(config.elasticsearchConfig)),
  });
  sinon.stub(app.services.pubsub, 'publish', () => Promise.resolve(true));
};
