import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';

import models from '../../models';
import { ADMIN_ROLES } from '../../constants';
import util from '../../util';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('copilotApplications.view'),
  (req, res, next) => {
    const canAccessAllApplications = util.hasRoles(req, ADMIN_ROLES) || util.hasProjectManagerRole(req);
    const userId = req.authUser.userId;
    const opportunityId = _.parseInt(req.params.id);

    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'createdAt desc';
    if (sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = ['createdAt asc', 'createdAt desc'];
    if (_.indexOf(sortableProps, sort) < 0) {
      return util.handleError('Invalid sort criteria', null, req, next);
    }
    const sortParams = sort.split(' ');

    // Admin can see all requests and the PM can only see requests created by them
    const whereCondition = _.assign({
      opportunityId,
    },
    canAccessAllApplications ? {} : { createdBy: userId },
    );

    return models.CopilotOpportunity.findOne({
      where: {
        id: opportunityId,
      }
    }).then((opportunity) => {
      if (!opportunity) {
        const err = new Error('No opportunity found');
        err.status = 404;
        throw err;
      }
      return models.CopilotApplication.findAll({
        where: whereCondition,
        include: [
          {
            model: models.CopilotOpportunity,
            as: 'copilotOpportunity',
          },
        ],
        order: [[sortParams[0], sortParams[1]]],
      })
        .then(copilotApplications => {
          req.log.debug(`CopilotApplications ${JSON.stringify(copilotApplications)}`);
          return models.ProjectMember.getActiveProjectMembers(opportunity.projectId).then((members) => {
            req.log.debug(`Fetched existing active members ${JSON.stringify(members)}`);
            req.log.debug(`Applications ${JSON.stringify(copilotApplications)}`);
            const enrichedApplications = copilotApplications.map(application => {
              const m = members.find(m => m.userId === application.userId);

              // Using spread operator fails in lint check
              // While Object.assign fails silently during run time
              // So using this method
              const enriched = {
                id: application.id,
                opportunityId: application.opportunityId,
                notes: application.notes,
                status: application.status,
                userId: application.userId,
                deletedAt: application.deletedAt,
                createdAt: application.createdAt,
                updatedAt: application.updatedAt,
                deletedBy: application.deletedBy,
                createdBy: application.createdBy,
                updatedBy: application.updatedBy,
                copilotOpportunity: application.copilotOpportunity,
              };

              if (m) {
                enriched.existingMembership = m;
              }

              req.log.debug(`Existing member to application ${JSON.stringify(enriched)}`);

              return enriched;
            });

            req.log.debug(`Enriched Applications ${JSON.stringify(enrichedApplications)}`);
            res.status(200).send(enrichedApplications);
          });
        })
    })
    .catch((err) => {
      util.handleError('Error fetching copilot applications', err, req, next);
    });
  },
];
