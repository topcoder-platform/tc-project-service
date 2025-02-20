import _ from 'lodash';

import models from '../../models';
import { ADMIN_ROLES } from '../../constants';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';

module.exports = [
  (req, res, next) => {
    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'createdAt desc';
    if (sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = ['createdAt asc', 'createdAt desc'];
    if (_.indexOf(sortableProps, sort) < 0) {
      return util.handleError('Invalid sort criteria', null, req, next);
    }
    const sortParams = sort.split(' ');

    models.CopilotOpportunity.findAll({
        include: [
            {
                model: models.CopilotRequest, 
                as: 'copilotRequest',
            },
            {
                model: models.Project,
                as: 'project',
            }
            ],
        order: [[sortParams[0], sortParams[1]]],
    })
      .then(copilotOpportunities => {
        const formattedOpportunities = copilotOpportunities.map(opportunity => {
            const plainOpportunity = opportunity.get({ plain: true });     
            return Object.assign({}, plainOpportunity, {
              requestData: (plainOpportunity.copilotRequest && plainOpportunity.copilotRequest.data) || {},
            });
        });
        return res.json(formattedOpportunities);
      })
      .catch((err) => {
        util.handleError('Error fetching copilot opportunities', err, req, next);
      });
  },
];
