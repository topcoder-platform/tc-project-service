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

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    workStreamId: Joi.number().integer().positive().required(),
    id: Joi.number().integer().positive().required(),
  },
  body: {
    param: Joi.object().keys({
      name: Joi.string().optional(),
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
  },
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

    const updatedProps = req.body.param;
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
            });
          });
      }),
    )
      .then(() => {
        req.log.debug('updated work', JSON.stringify(updated, null, 2));
        res.json(util.wrapResponse(req.id, _.omit(updated.toJSON(), 'WorkStreams')));
      })
      .catch(err => next(err));
  },
];
