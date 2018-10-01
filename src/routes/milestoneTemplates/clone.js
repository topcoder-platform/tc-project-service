/**
 * API to clone a milestone template
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';
import { MILESTONE_TEMPLATE_REFERENCES } from '../../constants';
import validateMilestoneTemplate from '../../middlewares/validateMilestoneTemplate';

const permissions = tcMiddleware.permissions;

const schema = {
  body: {
    param: Joi.object().keys({
      sourceReference: Joi.string().valid(_.values(MILESTONE_TEMPLATE_REFERENCES)).required(),
      sourceReferenceId: Joi.number().integer().positive().required(),
      reference: Joi.string().valid(_.values(MILESTONE_TEMPLATE_REFERENCES)).required(),
      referenceId: Joi.number().integer().positive().required(),
    }).required(),
  },
};

module.exports = [
  validate(schema),
  validateMilestoneTemplate.validateRequestBody,
  permissions('milestoneTemplate.clone'),
  (req, res, next) => {
    let result;

    return models.sequelize.transaction(tx =>
      // Find the product template
      models.MilestoneTemplate.findAll({
        where: {
          reference: req.body.param.sourceReference,
          referenceId: req.body.param.sourceReferenceId,
        },
        attributes: { exclude: ['id', 'deletedAt', 'createdAt', 'updatedAt', 'deletedBy'] },
        raw: true,
      })
        .then((milestoneTemplatesToClone) => {
          const newMilestoneTemplates = _.cloneDeep(milestoneTemplatesToClone);
          _.each(newMilestoneTemplates, (milestone) => {
            milestone.reference = req.body.param.reference; // eslint-disable-line no-param-reassign
            milestone.referenceId = req.body.param.referenceId; // eslint-disable-line no-param-reassign
            milestone.createdBy = req.authUser.userId; // eslint-disable-line no-param-reassign
            milestone.updatedBy = req.authUser.userId; // eslint-disable-line no-param-reassign
          });
          return models.MilestoneTemplate.bulkCreate(newMilestoneTemplates, { transaction: tx });
        })
        .then(() => { // eslint-disable-line arrow-body-style
          return models.MilestoneTemplate.findAll({
            where: {
              reference: req.body.param.reference,
              referenceId: req.body.param.referenceId,
            },
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
            raw: true,
          })
            .then((clonedMilestoneTemplates) => {
              result = clonedMilestoneTemplates;
              return result;
            });
        }),
    )
      .then(() => {
        // Write to response
        res.status(201).json(util.wrapResponse(req.id, result, result.length, 201));
      })
      .catch(next);
  },
];
