
import _ from 'lodash';
import config from 'config';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';
import { ADMIN_ROLES } from '../../constants';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

const eClient = util.getElasticSearchClient();

const PHASE_ATTRIBUTES = _.keys(models.ProjectPhase.rawAttributes);

const permissions = tcMiddleware.permissions;

const populateMemberDetails = async (phases, logger, id) => {
  const userIds = _.reduce(phases, (acc, phase) => _.concat(acc, _.map(phase.members, 'userId')), []);
  if (userIds.length > 0) {
    const details = await util.getMemberDetailsByUserIds(userIds, logger, id);
    _.forEach(phases, (phase) => {
      _.forEach(phase.members, (member) => {
        _.assign(member, _.find(details, detail => detail.userId === member.userId));
      });
    });
  }
  return phases;
};
module.exports = [
  permissions('project.view'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);

    // Parse the fields string to determine what fields are to be returned
    let fields = req.query.fields ? decodeURIComponent(req.query.fields).split(',') : PHASE_ATTRIBUTES;
    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'startDate';
    const memberOnly = req.query.memberOnly ? req.query.memberOnly.toLowerCase() === 'true' : false;
    const isAdmin = util.hasRoles(req, ADMIN_ROLES);
    if (sort && sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = [
      'startDate asc', 'startDate desc',
      'endDate asc', 'endDate desc',
      'status asc', 'status desc',
      'order asc', 'order desc',
    ];
    if (sort && _.indexOf(sortableProps, sort) < 0) {
      return util.handleError('Invalid sort criteria', null, req, next);
    }
    const sortColumnAndOrder = sort.split(' ');

    // Get project from ES
    return eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: req.params.projectId })
      .then((doc) => {
        req.log.debug('phases found in ES');
        // Get the phases
        let phases = _.isArray(doc._source.phases) ? doc._source.phases : []; // eslint-disable-line no-underscore-dangle

        if (memberOnly && !isAdmin) {
          phases = _.filter(phases, phase => _.includes(_.map(_.get(phase, 'members'), 'userId')), req.authUser.userId);
        }
        // Sort
        phases = _.orderBy(phases, [sortColumnAndOrder[0]], [sortColumnAndOrder[1]]);

        fields = _.intersection(fields, [...PHASE_ATTRIBUTES, 'products', 'members']);
        if (_.indexOf(fields, 'id') < 0) {
          fields.push('id');
        }

        phases = _.map(phases, phase => _.pick(phase, fields));
        return populateMemberDetails(phases, req.log, req.id)
          .then(result => res.json(result));
      })
      .catch((err) => {
        if (err.status === 404) {
          req.log.debug('No phases found in ES');
          const include = {
            model: models.ProjectPhase,
            as: 'phases',
            order: [['startDate', 'asc']],
            include: [],
          };
          if (_.indexOf(fields, 'products') >= 0) {
            include.include.push({
              model: models.PhaseProduct,
              as: 'products',
            });
          }
          if (_.indexOf(fields, 'members') >= 0) {
            include.include.push({
              model: models.ProjectPhaseMember,
              as: 'members',
            });
          }
          // Load the phases
          return models.Project.findByPk(projectId, {
            include: [include],
          })
            .then((project) => {
              if (!project) {
                const apiErr = new Error(`active project not found for project id ${projectId}`);
                apiErr.status = 404;
                return next(apiErr);
              }

              // Get the phases
              let phases = _.isArray(project.phases) ? project.phases : [];
              phases = _.map(phases, phase => phase.toJSON());
              if (memberOnly && !isAdmin) {
                phases = _.filter(phases, phase =>
                  _.includes(_.map(_.get(phase, 'members'), 'userId')), req.authUser.userId);
              }
              // Sort
              phases = _.orderBy(phases, [sortColumnAndOrder[0]], [sortColumnAndOrder[1]]);
              _.remove(PHASE_ATTRIBUTES, attribute => _.includes(['deletedAt', 'deletedBy'], attribute));
              fields = _.intersection(fields, [...PHASE_ATTRIBUTES, 'products', 'members']);
              if (_.indexOf(fields, 'id') < 0) {
                fields.push('id');
              }
              phases = _.map(phases, phase => _.pick(phase, fields));
              // Write to response
              return populateMemberDetails(phases, req.log, req.id)
                .then(result => res.json(result));
            });
        }
        return next(err);
      });
  },
];
