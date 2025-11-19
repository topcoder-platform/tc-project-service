
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';
import { ADMIN_ROLES } from '../../constants';

const PHASE_ATTRIBUTES = _.without(_.keys(models.ProjectPhase.rawAttributes), 'deletedAt', 'deletedBy');

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('project.view'),
  async (req, res, next) => {
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
    const [sortColumn, sortDirection] = sort.split(' ');
    const membersRequested = _.indexOf(fields, 'members') >= 0;

    const include = {
      model: models.ProjectPhase,
      as: 'phases',
      include: [],
    };
    if (_.indexOf(fields, 'products') >= 0) {
      include.include.push({
        model: models.PhaseProduct,
        as: 'products',
      });
    }
    const needsMemberInclude = membersRequested || (memberOnly && !isAdmin);
    if (needsMemberInclude) {
      include.include.push({
        model: models.ProjectPhaseMember,
        as: 'members',
        attributes: ['userId'],
      });
    }
    if (_.indexOf(fields, 'approvals') >= 0) {
      include.include.push({
        model: models.ProjectPhaseApproval,
        as: 'approvals',
      });
    }

    try {
      const project = await models.Project.findByPk(projectId, {
        include: [include],
        order: [[{ model: models.ProjectPhase, as: 'phases' }, sortColumn, sortDirection]],
      });

      if (!project) {
        const apiErr = new Error(`active project not found for project id ${projectId}`);
        apiErr.status = 404;
        return next(apiErr);
      }

      let phases = _.isArray(project.phases) ? project.phases : [];
      phases = _.map(phases, phase => phase.toJSON());
      if (memberOnly && !isAdmin) {
        phases = _.filter(phases, phase =>
          _.includes(_.map(_.get(phase, 'members'), 'userId'), req.authUser.userId));
      }
      if (!membersRequested) {
        phases = _.map(phases, phase => _.omit(phase, 'members'));
      }

      fields = _.intersection(fields, [...PHASE_ATTRIBUTES, 'products', 'members', 'approvals']);
      if (_.indexOf(fields, 'id') < 0) {
        fields.push('id');
      }
      phases = _.map(phases, phase => _.pick(phase, fields));

      if (_.indexOf(fields, 'members') < 0) {
        return res.json(phases);
      }
      const populatedPhases = await util.populatePhasesWithMemberDetails(phases, req);
      return res.json(populatedPhases);
    } catch (err) {
      return next(err);
    }
  },
];
