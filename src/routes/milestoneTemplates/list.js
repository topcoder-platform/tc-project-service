/**
 * API to list all milestone templates
 */
import validate from 'express-validation';
import Joi from 'joi';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    productTemplateId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('milestoneTemplate.view'),
  (req, res, next) => {
    // Parse the sort query
    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'order';
    if (sort && sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = [
      'order asc', 'order desc',
    ];
    if (sort && _.indexOf(sortableProps, sort) < 0) {
      const apiErr = new Error('Invalid sort criteria');
      apiErr.status = 422;
      return next(apiErr);
    }
    const sortColumnAndOrder = sort.split(' ');

    // Get all milestone templates
    return models.ProductMilestoneTemplate.findAll({
      where: {
        productTemplateId: req.params.productTemplateId,
      },
      order: [sortColumnAndOrder],
      attributes: { exclude: ['deletedAt', 'deletedBy'] },
      raw: true,
    })
      .then((milestoneTemplates) => {
        res.json(util.wrapResponse(req.id, milestoneTemplates));
      })
      .catch(next);
  },
];
