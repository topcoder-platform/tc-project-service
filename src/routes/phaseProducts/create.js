
import validate from 'express-validation';
import _ from 'lodash';
import config from 'config';
import Joi from 'joi';

import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES } from '../../constants';

const permissions = require('tc-core-library-js').middleware.permissions;

const addPhaseProductValidations = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    type: Joi.string().required(),
    templateId: Joi.number().positive().optional(),
    directProjectId: Joi.number().positive().optional(),
    billingAccountId: Joi.number().positive().optional(),
    estimatedPrice: Joi.number().positive().optional(),
    actualPrice: Joi.number().positive().optional(),
    details: Joi.any().optional(),
  }).required(),
};

module.exports = [
  // validate request payload
  validate(addPhaseProductValidations),
  // check permission
  permissions('project.addPhaseProduct'),
  // do the real work
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);

    const data = req.body;
    // default values
    _.assign(data, {
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    let newPhaseProduct = null;
    models.sequelize.transaction(() => models.Project.findOne({
      where: { id: projectId, deletedAt: { $eq: null } },
      raw: true,
    }).then((existingProject) => {
      // make sure project exists
      if (!existingProject) {
        const err = new Error(`project not found for project id ${projectId}`);
        err.status = 404;
        throw err;
      }
      _.assign(data, {
        projectId,
        directProjectId: existingProject.directProjectId,
        billingAccountId: existingProject.billingAccountId,
      });

      return models.ProjectPhase.findOne({
        where: { id: phaseId, projectId, deletedAt: { $eq: null } },
        raw: true,
      });
    }).then((existingPhase) => {
      // make sure phase exists
      if (!existingPhase) {
        const err = new Error(`project phase not found for project id ${projectId}` +
          ` and phase id ${phaseId}`);
        err.status = 404;
        throw err;
      }
      _.assign(data, {
        phaseId,
      });

      return models.PhaseProduct.count({
        where: {
          projectId,
          phaseId,
          deletedAt: { $eq: null },
        },
        raw: true,
      });
    }).then((productCount) => {
      // make sure number of products of per phase <= max value
      if (productCount >= config.maxPhaseProductCount) {
        const err = new Error('the number of products per phase cannot exceed ' +
          `${config.maxPhaseProductCount}`);
        err.status = 400;
        throw err;
      }
      return models.PhaseProduct.create(data)
        .then((_newPhaseProduct) => {
          newPhaseProduct = _.cloneDeep(_newPhaseProduct);
          req.log.debug('new phase product created (id# %d, name: %s)',
            newPhaseProduct.id, newPhaseProduct.name);
          newPhaseProduct = newPhaseProduct.get({ plain: true });
          newPhaseProduct = _.omit(newPhaseProduct, ['deletedAt', 'utm']);
        });
    }))
      .then(() => {
        // emit the event
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_PHASE_PRODUCT_ADDED,
          RESOURCES.PHASE_PRODUCT,
          newPhaseProduct);

        res.status(201).json(newPhaseProduct);
      })
      .catch((err) => { next(err); });
  },
];
