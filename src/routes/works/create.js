/**
 * API to add a phase as work
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import Sequelize from 'sequelize';

import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES } from '../../constants';

const permissions = require('tc-core-library-js').middleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    workStreamId: Joi.number().integer().positive().required(),
  },
  body: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string().optional(),
    requirements: Joi.string().optional(),
    status: Joi.string().required(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    duration: Joi.number().min(0).optional(),
    budget: Joi.number().min(0).optional(),
    spentBudget: Joi.number().min(0).optional(),
    progress: Joi.number().min(0).optional(),
    details: Joi.any().optional(),
    order: Joi.number().integer().optional(),
    productTemplateId: Joi.number().integer().positive().optional(),
  }).required(),
};

module.exports = [
  // validate request payload
  validate(schema),
  // check permission
  permissions('work.create'),
  // do the real work
  (req, res, next) => {
    // default values
    const projectId = _.parseInt(req.params.projectId);
    const workStreamId = _.parseInt(req.params.workStreamId);

    const data = req.body;
    _.assign(data, {
      projectId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    let existingWorkStream = null;
    let newProjectPhase = null;

    req.log.debug('Create Work - Starting transaction');
    return models.sequelize.transaction(() =>
      models.WorkStream.findOne({
        where: {
          id: workStreamId,
          projectId,
          deletedAt: { $eq: null },
        },
      })
        .then((_existingWorkStream) => {
          if (!_existingWorkStream) {
            // handle 404
            const err = new Error(`active work stream not found for project id ${projectId} ` +
              `and work stream id ${workStreamId}`);
            err.status = 404;
            throw err;
          }

          existingWorkStream = _existingWorkStream;

          if (data.startDate !== null && data.endDate !== null && data.startDate > data.endDate) {
            const err = new Error('startDate must not be after endDate.');
            err.status = 400;
            throw err;
          }
          return models.ProjectPhase.create(data);
        })
        .then((_newProjectPhase) => {
          newProjectPhase = _.omit(_newProjectPhase.toJSON(), ['deletedAt', 'deletedBy']);
          return existingWorkStream.addProjectPhase(_newProjectPhase.id);
        })
        .then(() => {
          req.log.debug('re-ordering the other phases');

          if (_.isNil(newProjectPhase.order)) {
            return Promise.resolve();
          }
          // Increase the order of the other phases in the same project,
          // which have `order` >= this phase order
          return models.ProjectPhase.update({ order: Sequelize.literal('"order" + 1') }, {
            where: {
              projectId,
              id: { $ne: newProjectPhase.id },
              order: { $gte: newProjectPhase.order },
            },
          });
        })
        .then(() => {
          if (_.isNil(data.productTemplateId)) {
            return Promise.resolve();
          }

          // Get the product template
          return models.ProductTemplate.findByPk(data.productTemplateId)
            .then((productTemplate) => {
              if (!productTemplate) {
                const err = new Error(`Product template does not exist with id = ${data.productTemplateId}`);
                err.status = 400;
                throw err;
              }

              // Create the phase product
              return models.PhaseProduct.create({
                name: productTemplate.name,
                templateId: data.productTemplateId,
                type: productTemplate.productKey,
                projectId,
                phaseId: newProjectPhase.id,
                createdBy: req.authUser.userId,
                updatedBy: req.authUser.userId,
              })
                .then((phaseProduct) => {
                  newProjectPhase.products = [
                    _.omit(phaseProduct.toJSON(), ['deletedAt', 'deletedBy']),
                  ];
                });
            });
        }),
    )
      .then(() => {
        req.log.debug('Sending event to Kafka bus for project phase %d', newProjectPhase.id);
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_PHASE_ADDED,
          RESOURCES.PHASE,
          newProjectPhase,
        );

        res.status(201).json(newProjectPhase);
      })
      .catch((err) => {
        util.handleError('Error creating work', err, req, next);
      });
  },
];
