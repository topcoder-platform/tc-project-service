/**
 * API to get a milestone template
 */
import validate from 'express-validation';
import Joi from 'joi';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
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
  (req, res, next) =>
    util.fetchByIdFromES('milestoneTemplates', {
      query: {
        nested: {
          path: 'milestoneTemplates',
          query: {
            match: { 'milestoneTemplates.id': req.params.milestoneTemplateId },
          },
          inner_hits: {},
        },
      },
    }, 'metadata')
      .then((data) => {
        if (data.length === 0) {
          req.log.debug('No milestoneTemplate found in ES');
          return res.json(_.omit(req.milestoneTemplate.toJSON(), 'deletedAt', 'deletedBy'));
        }
        req.log.debug('milestoneTemplate found in ES');
        return res.json(data[0].inner_hits.milestoneTemplates.hits.hits[0]._source); // eslint-disable-line no-underscore-dangle
      })
      .catch(next),
];
