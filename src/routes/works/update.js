/**
 * API to update work
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import Sequelize from 'sequelize';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES, ROUTES } from '../../constants';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    workStreamId: Joi.number().integer().positive().required(),
    id: Joi.number().integer().positive().required(),
  },
  body: Joi.object().keys({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    requirements: Joi.string().optional(),
    status: Joi.string().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    duration: Joi.number().min(0).optional(),
    budget: Joi.number().min(0).optional(),
    spentBudget: Joi.number().min(0).optional(),
    progress: Joi.number().min(0).optional(),
    details: Joi.any().optional(),
    order: Joi.number().integer().optional(),
  }).required(),
};


module.exports = [
  // validate request payload
  validate(schema),
  // check permission
  permissions('work.edit'),

  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const workStreamId = _.parseInt(req.params.workStreamId);
    const phaseId = _.parseInt(req.params.id);

    const updatedProps = req.body;
    updatedProps.updatedBy = req.authUser.userId;

    let previousValue;
    let updated;

    models.sequelize.transaction(() => models.ProjectPhase.findOne({
      where: {
        id: phaseId,
        projectId,
      },
      include: [{
        model: models.WorkStream,
        through: { attributes: [] },
        where: {
          id: workStreamId,
          projectId,
        },
      }],
    })
      .then((existing) => {
        if (!existing) {
        // handle 404
          const err = new Error('No active project phase found for project id ' +
          `${projectId} and work stream ${workStreamId} and phase id ${phaseId}`);
          err.status = 404;
          throw err;
        } else {
          previousValue = _.clone(existing.get({ plain: true }));

          // make sure startDate < endDate
          let startDate;
          let endDate;
          if (updatedProps.startDate) {
            startDate = new Date(updatedProps.startDate);
          } else {
            startDate = existing.startDate !== null ? new Date(existing.startDate) : null;
          }

          if (updatedProps.endDate) {
            endDate = new Date(updatedProps.endDate);
          } else {
            endDate = existing.endDate !== null ? new Date(existing.endDate) : null;
          }

          if (startDate !== null && endDate !== null && startDate > endDate) {
            const err = new Error('startDate must not be after endDate.');
            err.status = 400;
            throw err;
          } else {
            _.extend(existing, updatedProps);
            return existing.save().catch(next);
          }
        }
      })
      .then((updatedPhase) => {
        updated = updatedPhase;
        // Ignore re-ordering if there's no order specified for this phase
        if (_.isNil(updated.order)) {
          return Promise.resolve();
        }

        // Update order of the other phases only if the order was changed
        if (previousValue.order === updated.order) {
          return Promise.resolve();
        }

        return models.ProjectPhase.count({
          where: {
            id: { $ne: phaseId },
          },
          include: [{
            model: models.WorkStream,
            where: {
              id: workStreamId,
              projectId,
            },
          }],
        })
          .then((count) => {
            if (count === 0) {
              return Promise.resolve();
            }

            // Increase the order from M to K: if there is an item with order K,
            // orders from M+1 to K should be made M to K-1
            if (!_.isNil(previousValue.order) && previousValue.order < updated.order) {
              return models.ProjectPhase.update({ order: Sequelize.literal('"order" - 1') }, {
                where: {
                  projectId,
                  id: { $ne: updated.id },
                  order: { $between: [previousValue.order + 1, updated.order] },
                },
                include: [{
                  model: models.WorkStream,
                  where: {
                    id: workStreamId,
                    projectId,
                  },
                }],
              });
            }

            // Decrease the order from M to K: if there is an item with order K,
            // orders from K to M-1 should be made K+1 to M
            return models.ProjectPhase.update({ order: Sequelize.literal('"order" + 1') }, {
              where: {
                projectId,
                id: { $ne: updated.id },
                order: {
                  $between: [
                    updated.order,
                    (previousValue.order ? previousValue.order : Number.MAX_SAFE_INTEGER) - 1,
                  ],
                },
              },
              include: [{
                model: models.WorkStream,
                where: {
                  id: workStreamId,
                  projectId,
                },
              }],
            });
          });
      }),
    )
      .then((updatedCount) => {
        if (updatedCount) {
          return models.ProjectPhase.findAll({
            where: {
              projectId,
              id: { $ne: updated.id },
              order: {
                $between: !_.isNil(previousValue.order) && previousValue.order < updated.order
                  ? [previousValue.order + 1, updated.order]
                  : [
                    updated.order,
                    (previousValue.order ? previousValue.order : Number.MAX_SAFE_INTEGER) - 1,
                  ],
              },
            },
            include: [{
              model: models.WorkStream,
              where: {
                id: workStreamId,
                projectId,
              },
            }],
            order: [['updatedAt', 'DESC']],
            limit: updatedCount[0],
          });
        }
        return Promise.resolve([]);
      })
      .then((otherUpdated) => {
        req.log.debug('updated project phase', JSON.stringify(updated, null, 2));

        const updatedValue = updated.get({ plain: true });
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED,
          RESOURCES.PHASE,
          updatedValue,
          previousValue,
          ROUTES.WORKS.UPDATE,
        );

        // send updated event for all other phases which have been cascading updated
        _.map(otherUpdated, phase =>
          util.sendResourceToKafkaBus(
            req,
            EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED,
            RESOURCES.PHASE,
            _.assign(_.pick(phase.toJSON(), 'id', 'order', 'updatedBy', 'updatedAt')),
            // Pass the same object as original phase even though, the order has changed.
            // So far we don't use the order so it's ok. But in general, we should pass
            // the original phases. <- TODO
            _.assign(_.pick(phase.toJSON(), 'id', 'order', 'updatedBy', 'updatedAt'))),
        true, // don't send event to Notification Service as the main event here is updating one phase
        );

        res.json(updated);
      })
      .catch(err => next(err));
  },
];
