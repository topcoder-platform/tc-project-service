/* eslint-disable import/no-extraneous-dependencies,no-param-reassign */

import _ from 'lodash';
import bunyan from 'bunyan';
import config from 'config';
import Promise from 'bluebird';
import models from '../src/models';
import RabbitMQService from '../src/services/rabbitmq';
import { TIMELINE_REFERENCES } from '../src/constants';

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

/**
 * Retrieve timeline ids from cli if provided
 * @return {Array} list of timelineIds
 */
function getTimelineIds() {
  let timelineIdArg = _.find(process.argv, a => a.indexOf('timelineIds') > -1);
  if (timelineIdArg) {
    timelineIdArg = timelineIdArg.split('=');
    return timelineIdArg[1].split(',').map(i => parseInt(i, 10));
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
    let projects = yield models.Project.findAll({
      where: projectWhereClause,
      include: [{
        model: models.ProjectPhase,
        as: 'phases',
        include: [{ model: models.PhaseProduct, as: 'products' }],
      }],
    });
    logger.info(`Retrieved #${projects.length} projects`);

    // Convert to raw json
    projects = _.map(projects, project => project.toJSON());

    const memberWhereClause = (projectIds.length > 0)
      ? { projectId: { $in: projectIds } }
      : { deletedAt: { $eq: null } };
    let members = yield models.ProjectMember.findAll({
      raw: true,
      where: memberWhereClause,
    });
    logger.info(`Retrieved #${members.length} members`);
    members = _.groupBy(members, 'projectId');

    // Get timelines
    const timelineIds = getTimelineIds();
    const timelineWhereClause = (timelineIds.length > 0) ? { id: { $in: timelineIds } } : {};
    let timelines = yield models.Timeline.findAll({
      where: timelineWhereClause,
      include: [{ model: models.Milestone, as: 'milestones' }],
    });
    logger.info(`Retrieved #${projects.length} timelines`);

    // Convert to raw json and remove unnecessary fields
    timelines = _.map(timelines, (timeline) => {
      const entity = _.omit(timeline.toJSON(), ['deletedBy', 'deletedAt']);
      entity.milestones = _.map(entity.milestones, milestone => _.omit(milestone, ['deletedBy', 'deletedAt']));
      return entity;
    });

    // Get projectId for each timeline
    yield Promise.all(
      _.map(timelines, (timeline) => {
        if (timeline.reference === TIMELINE_REFERENCES.PROJECT) {
          timeline.projectId = timeline.referenceId;
          return Promise.resolve(timeline);
        }

        return models.ProjectPhase.findById(timeline.referenceId)
          .then((phase) => {
            timeline.projectId = phase.projectId;
            return Promise.resolve(timeline);
          });
      }),
    );

    const promises = [];
    _.forEach(projects, (p) => {
      p.members = members[p.id];
      logger.debug(`Processing Project #${p.id}`);
      promises.push(rabbit.publish('project.initial', p, {}));
    });
    _.forEach(timelines, (t) => {
      logger.debug(`Processing Timeline #${t.id}`);
      promises.push(rabbit.publish('timeline.initial', t, {}));
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
