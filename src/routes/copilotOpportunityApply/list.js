import _ from 'lodash';

import models from '../../models';
import { ADMIN_ROLES } from '../../constants';
import util from '../../util';

module.exports = [
  (req, res, next) => {
    const isAdminOrPM = util.hasRoles(req, ADMIN_ROLES) || util.hasProjectManagerRole(req);
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

    const whereCondition = _.assign({
      opportunityId,
    },
    );

    return models.CopilotOpportunity.findOne({
      where: {
        id: opportunityId,
      },
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
        .then((copilotApplications) => {
          req.log.debug(`CopilotApplications ${JSON.stringify(copilotApplications)}`);
          return models.ProjectMember.getActiveProjectMembers(opportunity.projectId).then((members) => {
            req.log.debug(`Fetched existing active members ${JSON.stringify(members)}`);
            req.log.debug(`Applications ${JSON.stringify(copilotApplications)}`);
            const enrichedApplications = copilotApplications.map((application) => {
              const member = members.find(memberItem => memberItem.userId === application.userId);

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

              if (member) {
                enriched.existingMembership = member;
              }

              req.log.debug(`Existing member to application ${JSON.stringify(enriched)}`);

              return enriched;
            });

            const response = isAdminOrPM
              ? enrichedApplications
              : enrichedApplications.map(app => ({
                userId: app.userId,
                status: app.status,
                createdAt: app.createdAt,
              }));

            req.log.debug(`Enriched Applications ${JSON.stringify(enrichedApplications)}`);
            res.status(200).send(response);
          });
        });
    })
      .catch((err) => {
        util.handleError('Error fetching copilot applications', err, req, next);
      });
  },
];
