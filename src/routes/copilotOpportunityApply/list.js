import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';

import models from '../../models';
import { ADMIN_ROLES } from '../../constants';
import util from '../../util';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('copilotApplications.view'),
  async (req, res, next) => {
    const canAccessAllApplications = util.hasRoles(req, ADMIN_ROLES) || util.hasProjectManagerRole(req);
    const userId = req.authUser.userId;
    const opportunityId = _.parseInt(req.params.id);

    const opportunity = await models.CopilotOpportunity.findOne({
      where: {
        id: opportunityId,
      }
    });

    if (!opportunity) {
      const err = new Error('No opportunity found');
      err.status = 404;
      throw err;
    }

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
        return models.ProjectMember.getActiveProjectMembers(opportunity.projectId).then((members) => {
          return res.json(copilotApplications.map(application => {
            return Object.assign({}, application, {
              existingMembership: members.find(m => m.userId === application.userId),
            });
          }));
        });
      })
      .catch((err) => {
        util.handleError('Error fetching copilot applications', err, req, next);
      });
  },
];
