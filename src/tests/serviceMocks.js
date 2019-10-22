
/* globals Promise */

import sinon from 'sinon';
import _ from 'lodash';
// we do need to test elasticsearch indexing
import config from 'config';
import elasticsearch from 'elasticsearch';
import util from '../util';
import mockRabbitMQ from './mockRabbitMQ';

module.exports = (app) => {
  mockRabbitMQ(app);

  _.assign(app.services, {
    es: new elasticsearch.Client(_.cloneDeep(config.elasticsearchConfig)),
  });
  sinon.stub(util, 'getM2MToken', () => Promise.resolve('MOCK_TOKEN'));
};
