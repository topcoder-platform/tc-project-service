/* eslint-disable import/no-extraneous-dependencies,no-param-reassign */

import _ from 'lodash';
import bunyan from 'bunyan';
import config from 'config';
import Promise from 'bluebird';
import models from '../src/models';
import RabbitMQService from '../src/services/rabbitmq';

const logger = bunyan.createLogger({ name: 'init-es', level: config.get('logLevel') });

Promise.coroutine(function* wrapped() {
  try {
    const rabbit = new RabbitMQService(logger);
    // initialize RabbitMQ
    yield rabbit.init(
      config.get('rabbitmqURL'),
      config.get('pubsubExchangeName'),
      config.get('pubsubQueueName'),
    );

    const projects = yield models.Project.findAll({
      where: { deletedAt: { $eq: null } },
      raw: true,
    });
    logger.info(`Retrieved #${projects.length} projects`);

    let members = yield models.ProjectMember.findAll({
      raw: true,
      where: { deletedAt: { $eq: null } },
    });
    logger.info(`Retrieved #${members.length} members`);
    members = _.groupBy(members, 'projectId');

    const promises = [];
    _.forEach(projects, (p) => {
      p.members = members[p.id];
      logger.debug(`Processing #${p.id}`);
      promises.push(rabbit.publish('project.initial', p, {}));
    });
    Promise.all(promises)
    .then(() => {
      logger.info(`Published ${promises.length} msgs`);
      process.exit();
    })
    .catch((err) => {
      logger.error(err);
      process.exit();
    });
  } catch (err) {
    logger.error(err);
    process.exit();
  }
})();
