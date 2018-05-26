/**
 * API to list all product templates
 */
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('productTemplate.view'),
  (req, res, next) => models.ProductTemplate.findAll({
    where: {
      deletedAt: { $eq: null },
    },
    attributes: { exclude: ['deletedAt', 'deletedBy'] },
    raw: true,
  })
    .then((productTemplates) => {
      res.json(util.wrapResponse(req.id, productTemplates));
    })
    .catch(next),
];
