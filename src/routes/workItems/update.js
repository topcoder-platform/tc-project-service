/**
 * API to update a work item
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES, ROUTES } from '../../constants';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    workStreamId: Joi.number().integer().positive().required(),
    workId: Joi.number().integer().positive().required(),
    id: Joi.number().integer().positive().required(),
  },
  body: {
    name: Joi.string().optional(),
    type: Joi.string().optional(),
    templateId: Joi.number().positive().optional(),
    directProjectId: Joi.number().positive().optional(),
    billingAccountId: Joi.number().positive().optional(),
    estimatedPrice: Joi.number().positive().optional(),
    actualPrice: Joi.number().positive().optional(),
    details: Joi.any().optional(),
  },
};


module.exports = [
  // validate request payload
  validate(schema),
  // check permission
  permissions('workItem.edit'),

  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const workStreamId = _.parseInt(req.params.workStreamId);
    const phaseId = _.parseInt(req.params.workId);
    const productId = _.parseInt(req.params.id);

    const updatedProps = req.body;
    updatedProps.updatedBy = req.authUser.userId;

    let previousValue;

    models.sequelize.transaction(() => models.ProjectPhase.findOne({
      where: {
        id: phaseId,
        projectId,
      },
      include: [{
        model: models.WorkStream,
        where: {
          id: workStreamId,
          projectId,
        },
      },
      ],
    })
      .then((existingWork) => {
        if (!existingWork) {
        // handle 404
          const err = new Error('No active work item found for project id ' +
          `${projectId}, phase id ${phaseId} and work stream id ${workStreamId}`);
          err.status = 404;
          return Promise.reject(err);
        }

        return models.PhaseProduct.findOne({
          where: {
            id: productId,
            projectId,
            phaseId,
            deletedAt: { $eq: null },
          },
        });
      })
      .then((existing) => {
        if (!existing) {
          // handle 404
          const err = new Error('No active phase product found for project id ' +
              `${projectId}, phase id ${phaseId} and product id ${productId}`);
          err.status = 404;
          throw err;
        }

        previousValue = _.clone(existing.get({ plain: true }));
        _.extend(existing, updatedProps);
        return existing.save().catch(next);
      }))
      .then((updated) => {
        req.log.debug('updated work item', JSON.stringify(updated, null, 2));

        const updatedValue = updated.get({ plain: true });
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_UPDATED,
          RESOURCES.PHASE_PRODUCT,
          updatedValue,
          previousValue,
          ROUTES.WORK_ITEMS.UPDATE,
        );

        res.json(updated);
      }).catch(err => next(err));
  },
];
