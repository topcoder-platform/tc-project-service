/**
 * API to clone a milestone template
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';
import { EVENT, RESOURCES, MILESTONE_TEMPLATE_REFERENCES } from '../../constants';
import validateMilestoneTemplate from '../../middlewares/validateMilestoneTemplate';

const permissions = tcMiddleware.permissions;

const schema = {
  body: Joi.object().keys({
    sourceReference: Joi.string().valid(_.values(MILESTONE_TEMPLATE_REFERENCES)).required(),
    sourceReferenceId: Joi.number().integer().positive().required(),
    reference: Joi.string().valid(_.values(MILESTONE_TEMPLATE_REFERENCES)).required(),
    referenceId: Joi.number().integer().positive().required(),
  }).required(),
};

module.exports = [
  validate(schema),
  validateMilestoneTemplate.validateRequestBody,
  permissions('milestoneTemplate.clone'),
  (req, res, next) => {
    let result;

    return models.sequelize.transaction(() =>
      // Find the product template
      models.MilestoneTemplate.findAll({
        where: {
          reference: req.body.sourceReference,
          referenceId: req.body.sourceReferenceId,
        },
        attributes: { exclude: ['id', 'deletedAt', 'createdAt', 'updatedAt', 'deletedBy'] },
        raw: true,
      })
        .then((milestoneTemplatesToClone) => {
          const newMilestoneTemplates = _.cloneDeep(milestoneTemplatesToClone);
          _.each(newMilestoneTemplates, (milestone) => {
            milestone.reference = req.body.reference; // eslint-disable-line no-param-reassign
            milestone.referenceId = req.body.referenceId; // eslint-disable-line no-param-reassign
            milestone.createdBy = req.authUser.userId; // eslint-disable-line no-param-reassign
            milestone.updatedBy = req.authUser.userId; // eslint-disable-line no-param-reassign
          });
          return models.MilestoneTemplate.bulkCreate(newMilestoneTemplates);
        })
        .then(() => { // eslint-disable-line arrow-body-style
          return models.MilestoneTemplate.findAll({
            where: {
              reference: req.body.reference,
              referenceId: req.body.referenceId,
            },
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
            raw: true,
          })
            .then((clonedMilestoneTemplates) => {
              result = clonedMilestoneTemplates;
              return result;
            });
        }).then(otherUpdated => util.updateMetadataFromES(req.log, (source) => {
          const arr = _.isArray(source.milestoneTemplates) ? source.milestoneTemplates : [];
          _.each(result, (message) => {
            const index = _.findIndex(arr, p => p.id === message.id); // if org config does not exists already
            if (index === -1) {
              arr.push(message);
            } else { // if org config already exists, ideally we should never land here, but code handles the buggy indexing
              // replaces the old inconsistent index where previously org config was not removed from the index but deleted
              // from the database
              arr.splice(index, 1, message);
            }
          });
          return _.assign(source, { milestoneTemplates: arr });
        }).then(() => otherUpdated)),
    )
      .then(() => {
        // emit the event
        _.map(result, r => util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.MILESTONE_TEMPLATE_ADDED,
          RESOURCES.MILESTONE_TEMPLATE,
          r));

        // Write to response
        res.status(201).json(result);
      })
      .catch((err) => {
        if (result) {
          util.publishError(result, 'milestoneTemplate.clone', req.log);
        }
        next(err);
      });
  },
];
