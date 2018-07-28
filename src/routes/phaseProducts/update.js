
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT } from '../../constants';


const permissions = tcMiddleware.permissions;

const updatePhaseProductValidation = {
  body: {
    param: Joi.object().keys({
      name: Joi.string().optional(),
      type: Joi.string().optional(),
      templateId: Joi.number().optional(),
      directProjectId: Joi.number().positive().optional(),
      billingAccountId: Joi.number().positive().optional(),
      estimatedPrice: Joi.number().positive().optional(),
      actualPrice: Joi.number().positive().optional(),
      details: Joi.any().optional(),
    }).required(),
  },
};


module.exports = [
  // validate request payload
  validate(updatePhaseProductValidation),
  // check permission
  permissions('project.updatePhaseProduct'),

  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);
    const productId = _.parseInt(req.params.productId);

    const updatedProps = req.body.param;
    updatedProps.updatedBy = req.authUser.userId;

    let previousValue;

    models.sequelize.transaction(() => models.PhaseProduct.findOne({
      where: {
        id: productId,
        projectId,
        phaseId,
        deletedAt: { $eq: null },
      },
    }).then(existing => new Promise((accept, reject) => {
      if (!existing) {
          // handle 404
        const err = new Error('No active phase product found for project id ' +
              `${projectId}, phase id ${phaseId} and product id ${productId}`);
        err.status = 404;
        reject(err);
      } else {
        previousValue = _.clone(existing.get({ plain: true }));

        _.extend(existing, updatedProps);
        existing.save().then(accept).catch(reject);
      }
    })))
    .then((updated) => {
      req.log.debug('updated phase product', JSON.stringify(updated, null, 2));

      const updatedValue = updated.get({ plain: true });

      // emit original and updated project phase information
      req.app.services.pubsub.publish(
        EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_UPDATED,
        { original: previousValue, updated: updatedValue },
        { correlationId: req.id },
      );
      req.app.emit(EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_UPDATED,
        { req, original: previousValue, updated: updatedValue });

      res.json(util.wrapResponse(req.id, updated));
    }).catch(err => next(err));
  },
];
