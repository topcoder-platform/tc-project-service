import _ from 'lodash';

import models from '../../models';
import { ADMIN_ROLES } from '../../constants';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';

module.exports = [
  (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return util.handleError('Invalid opportunity ID', null, req, next, 400);
    }

    models.CopilotOpportunity.findOne({ 
        where: { id },
        include: [
            {
                model: models.CopilotRequest, 
                as: 'copilotRequest',
            },
            {
                model: models.Project,
                as: 'project',
                attributes: ['name'],
            }
        ],
    })
      .then((copilotOpportunity) => {
        res.json(copilotOpportunity);
      })
      .catch((err) => {
        util.handleError('Error fetching copilot opportunity', err, req, next);
      });
  },
];
