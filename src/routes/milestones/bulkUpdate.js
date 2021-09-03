/**
 * Bulk create/update/delete milestones
 */
import Promise from 'bluebird';
import _ from 'lodash';
import config from 'config';
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import validateTimeline from '../../middlewares/validateTimeline';
import { EVENT, RESOURCES } from '../../constants';
import models from '../../models';
import { createMilestone, deleteMilestone, updateMilestone } from './commonHelper';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    timelineId: Joi.number().integer().positive().required(),
  },
  body: Joi.array().items(Joi.object().keys({
    id: Joi.number().integer().positive(),
    name: Joi.string().max(255).optional(),
    description: Joi.string().max(255),
    duration: Joi.number().integer().min(1).optional(),
    startDate: Joi.date().required(),
    actualStartDate: Joi.date().allow(null),
    endDate: Joi.date().allow(null),
    completionDate: Joi.date().allow(null),
    status: Joi.string().max(45).optional(),
    type: Joi.string().max(45).optional(),
    details: Joi.object(),
    order: Joi.number().integer().optional(),
    plannedText: Joi.string().max(512).optional(),
    activeText: Joi.string().max(512).optional(),
    completedText: Joi.string().max(512).optional(),
    blockedText: Joi.string().max(512).optional(),
    hidden: Joi.boolean().optional(),
    statusComment: Joi.string().when('status', { is: 'paused', then: Joi.required(), otherwise: Joi.optional() }),
    createdAt: Joi.any().strip(),
    updatedAt: Joi.any().strip(),
    deletedAt: Joi.any().strip(),
    createdBy: Joi.any().strip(),
    updatedBy: Joi.any().strip(),
    deletedBy: Joi.any().strip(),
  })).required(),
  options: {
    contextRequest: true,
  },
};
let payload;
module.exports = [
  validate(schema),
  validateTimeline.validateTimelineIdParam,
  permissions('milestone.bulkUpdate'),
  (req, res, next) => models.sequelize.transaction(async (transaction) => {
    const timelineId = req.params.timelineId;
    const where = { timelineId };
    const { toKeep, toCreate } = req.body.reduce(
      (acc, item) => {
        if ({}.hasOwnProperty.call(item, 'id')) {
          acc.toKeep.set(item.id, item);
        } else {
          acc.toCreate.push(item);
        }
        return acc;
      },
      { toKeep: new Map(), toCreate: [] });
    const existing = await models.Milestone.findAll({ where }, { transaction });
    const { toUpdate, toDelete } = existing.reduce(
      (acc, item) => {
        if (toKeep.has(item.id)) {
          acc.toUpdate.push([item, toKeep.get(item.id)]);
        } else {
          acc.toDelete.push(item);
        }
        return acc;
      },
      { toDelete: [], toUpdate: [] });
    if (toUpdate.length < toKeep.size) {
      const existingIds = new Set(existing.map(item => item.id));
      toKeep.forEach((v, id) => {
        if (!existingIds.has(id)) {
          const apiErr = new Error(`Milestone not found for milestone id ${id}`);
          apiErr.status = 404;
          throw apiErr;
        }
      });
    }
    const created = await Promise.mapSeries(
      toCreate, data => createMilestone(req.authUser, req.timeline, data, transaction));
    const deleted = await Promise.mapSeries(
      toDelete, item => deleteMilestone(req.authUser, timelineId, item.id, transaction, item));
    const updated = await Promise.mapSeries(
      toUpdate, ([item, data]) => updateMilestone(req.authUser, timelineId, data, transaction, item));

    payload = { created, deleted, updated };
    // handle ES Update
    await util.updateTopObjectPropertyFromES(timelineId, async (source) => {
      // handle add milestone
      let milestones = _.isArray(source.milestones) ? source.milestones : [];

      const existingMilestoneIndex = _.findIndex(milestones, p => p.id === created.id); // if milestone does not exists already
      if (existingMilestoneIndex === -1) {
        // Increase the order of the other milestones in the same timeline,
        // which have `order` >= this milestone order
        _.each(milestones, (milestone) => {
          if (!_.isNil(milestone.order) && !_.isNil(created.order) && milestone.order >= created.order) {
            // eslint-disable-next-line no-param-reassign
            milestone.order += 1;
          }
        });

        milestones.push(created);
      } else { // if milestone already exists, ideally we should never land here, but code handles the buggy indexing
        // replaces the old inconsistent index where previously milestone was not removed from the index but deleted
        // from the database
        milestones.splice(existingMilestoneIndex, 1, created);
      }

      // handle delete milestone
      milestones = _.filter(source.milestones, single => single.id !== deleted.id);

      // handle update milestone
      milestones = _.map(milestones, (single) => {
        const singleUpdated = _.find(updated, ['updated.id', single.id]);
        if (singleUpdated) {
          return _.assign(single, singleUpdated.updated);
        }
        return single;
      });
      return _.assign(source, { milestones });
    }, config.get('elasticsearchConfig.timelineIndexName'));
    return { created, deleted, updated };
  })
    .then(async ({ created, deleted, updated }) => {
      [
        [created, EVENT.ROUTING_KEY.MILESTONE_ADDED],
        [deleted, EVENT.ROUTING_KEY.MILESTONE_REMOVED],
      ].forEach(([results, routingKey]) =>
        results.forEach(result => util.sendResourceToKafkaBus(req, routingKey, RESOURCES.MILESTONE, result)),
      );

      updated.forEach(({ updated: updatedMilestone, original: originalMilestone }) => {
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.MILESTONE_UPDATED,
          RESOURCES.MILESTONE,
          updatedMilestone,
          originalMilestone,
        );
      });

      // return all the timeline milestones after all updates
      const milestones = await req.timeline.getMilestones()
        .map(milestone => _.omit(milestone.toJSON(), ['deletedAt', 'deletedBy']));

      res.json(milestones);
    })
    .catch((err) => {
      if (payload) {
        util.publishError(payload, 'milestone.bulkUpdate', req.log);
      }
      next(err);
    }),
];
