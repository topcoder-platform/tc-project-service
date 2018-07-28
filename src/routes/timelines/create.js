/**
 * API to add a timeline
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import moment from 'moment';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import validateTimeline from '../../middlewares/validateTimeline';
import models from '../../models';
import { EVENT, TIMELINE_REFERENCES, MILESTONE_STATUS } from '../../constants';

const permissions = tcMiddleware.permissions;

const schema = {
  body: {
    param: Joi.object().keys({
      id: Joi.any().strip(),
      name: Joi.string().max(255).required(),
      description: Joi.string().max(255),
      startDate: Joi.date().required(),
      endDate: Joi.date().min(Joi.ref('startDate')).allow(null),
      reference: Joi.string().valid(_.values(TIMELINE_REFERENCES)).required(),
      referenceId: Joi.number().integer().positive().required(),
      templateId: Joi.number().integer().min(1).optional(),
      createdAt: Joi.any().strip(),
      updatedAt: Joi.any().strip(),
      deletedAt: Joi.any().strip(),
      createdBy: Joi.any().strip(),
      updatedBy: Joi.any().strip(),
      deletedBy: Joi.any().strip(),
    }).required(),
  },
};

module.exports = [
  validate(schema),
  // Validate and get projectId from the timeline request body, and set to request params
  // for checking by the permissions middleware
  validateTimeline.validateTimelineRequestBody,
  permissions('timeline.create'),
  (req, res, next) => {
    const templateId = req.body.param.templateId;
    const entity = _.assign({}, req.body.param, {
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });
    delete entity.templateId;

    let result;
    // Save to DB
    models.sequelize.transaction(() => {
      req.log.debug('Started transaction');
      return models.Timeline.create(entity)
        .then((createdEntity) => {
          // Omit deletedAt, deletedBy
          result = _.omit(createdEntity.toJSON(), 'deletedAt', 'deletedBy');
          req.log.debug('Checking templateId %d for creating milestones', templateId);
          if (templateId) {
            req.log.debug('Found templateId, finding milestone templates for the template');
            return models.ProductMilestoneTemplate.findAll({
              where: {
                productTemplateId: templateId,
                deletedAt: { $eq: null },
              },
            }).then((milestoneTemplates) => {
              if (milestoneTemplates) {
                req.log.debug('%d MilestoneTemplates found', milestoneTemplates.length);
                let startDate = moment.utc(new Date(createdEntity.startDate));
                const milestones = _.map(milestoneTemplates, (mt) => {
                  const endDate = moment.utc(startDate).add(mt.duration - 1, 'days');
                  const milestone = {
                    timelineId: createdEntity.id,
                    name: mt.name,
                    description: mt.description,
                    type: mt.type,
                    duration: mt.duration,
                    order: mt.order,
                    plannedText: mt.plannedText,
                    activeText: mt.activeText,
                    blockedText: mt.blockedText,
                    completedText: mt.completedText,
                    hidden: !!mt.hidden,
                    details: {},
                    status: MILESTONE_STATUS.REVIEWED,
                    startDate: startDate.format(),
                    endDate: endDate.format(),
                    createdBy: req.authUser.userId,
                    updatedBy: req.authUser.userId,
                  };
                  startDate = endDate.add(1, 'days');
                  return milestone;
                });
                return models.Milestone.bulkCreate(milestones, { returning: true })
                .then((createdMilestones) => {
                  req.log.debug('Milestones created for timeline with template id %d', templateId);
                  result.milestones = _.map(createdMilestones, cm => _.omit(cm.toJSON(), 'deletedAt', 'deletedBy'));
                });
              }
              // no milestone template found for the template
              req.log.debug('no milestone template found for the template id %d', templateId);
              return Promise.resolve();
            });
          }
          return Promise.resolve();
        })
        .catch(next);
    })
    .then(() => {
      // Send event to bus
      req.log.debug('Sending event to RabbitMQ bus for timeline %d', result.id);
      req.app.services.pubsub.publish(EVENT.ROUTING_KEY.TIMELINE_ADDED,
        _.assign({ projectId: req.params.projectId }, result),
        { correlationId: req.id },
      );
      // Write to the response
      res.status(201).json(util.wrapResponse(req.id, result, 1, 201));
      return Promise.resolve();
    })
    .catch(next);
  },
];
