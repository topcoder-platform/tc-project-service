
import _ from 'lodash';

import models from '../../models';
import util from '../../util';

const permissions = require('tc-core-library-js').middleware.permissions;

module.exports = [
  // check permission
  permissions('project.view'),

  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);
    const productId = _.parseInt(req.params.productId);

    return models.PhaseProduct.findOne({
      where: {
        id: productId,
        projectId,
        phaseId,
      },
    }).then((product) => {
      if (!product) {
        // handle 404
        const err = new Error('phase product not found for project id ' +
              `${projectId}, phase id ${phaseId} and product id ${productId}`);
        err.status = 404;
        throw err;
      } else {
        res.json(util.wrapResponse(req.id, product));
      }
    }).catch(err => next(err));
  },
];
