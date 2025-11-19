/**
 * API to get a milestone template
 */
import validate from 'express-validation';
import Joi from 'joi';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import validateMilestoneTemplate from '../../middlewares/validateMilestoneTemplate';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    milestoneTemplateId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  validateMilestoneTemplate.validateIdParam,
  permissions('milestoneTemplate.view'),
  (req, res) =>
    res.json(_.omit(req.milestoneTemplate.toJSON(), 'deletedAt', 'deletedBy')),
];
