import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';

import models from '../../models';
import util from '../../util';
import { PERMISSION } from '../../permissions/constants';

module.exports = [
  (req, res, next) => {
    if (!util.hasPermissionByReq(PERMISSION.MANAGE_COPILOT_REQUEST, req)) {
        const err = new Error('Unauthorized to view copilot requests');
        _.assign(err, {
          details: JSON.stringify({ message: 'You do not have permission to view copilot requests' }),
          status: 403,
        });
        return next(err);
    }
  
    const userId = req.authUser.userId;

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
    const whereCondition = isAdmin ? {} : { createdBy: userId };

    models.CopilotRequest.findAll({
      where: whereCondition,
      include: [
        {
          model: models.CopilotOpportunity, 
          as: 'opportunity',
        },
      ],
      order: [[sortParams[0], sortParams[1]]],
    })
      .then((copilotRequests) => res.json(copilotRequests))
      .catch((err) => {
        util.handleError('Error fetching copilot requests', err, req, next);
      });
  },
];
