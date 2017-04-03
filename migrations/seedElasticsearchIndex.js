/* eslint-disable import/no-extraneous-dependencies,no-param-reassign */

import _ from 'lodash';
import bunyan from 'bunyan';
import config from 'config';
import Promise from 'bluebird';
import models from '../src/models';
import RabbitMQService from '../src/services/rabbitmq';

const logger = bunyan.createLogger({ name: 'init-es', level: config.get('logLevel') });


/**
 * Retrieve project ids from cli if provided
 * @return {Array} list of projectIds
 */
function getProjectIds() {
  let projectIdArg = _.find(process.argv, a => a.indexOf('projectIds') > -1);
  if (projectIdArg) {
    projectIdArg = projectIdArg.split('=');
    return projectIdArg[1].split(',').map(i => parseInt(i, 10));
  }
  return [];
}

Promise.coroutine(function* wrapped() {
  try {
    const rabbit = new RabbitMQService(logger);
    // initialize RabbitMQ
    yield rabbit.init(
      config.get('rabbitmqURL'),
      config.get('pubsubExchangeName'),
      config.get('pubsubQueueName'),
    );


    const projectIds = getProjectIds();
    const projectWhereClause = (projectIds.length > 0) ? { id: { $in: projectIds } } : { deletedAt: { $eq: null } };
    const projects = yield models.Project.findAll({
      where: projectWhereClause,
      raw: true,
    });
    logger.info(`Retrieved #${projects.length} projects`);

    const memberWhereClause = (projectIds.length > 0)
      ? { projectId: { $in: projectIds } }
      : { deletedAt: { $eq: null } };
    let members = yield models.ProjectMember.findAll({
      raw: true,
      where: memberWhereClause,
    });
    logger.info(`Retrieved #${members.length} members`);
    members = _.groupBy(members, 'projectId');

    const promises = [];
    _.forEach(projects, (p) => {
      p.members = members[p.id];
      logger.debug(`Processing Project #${p.id}`);
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
