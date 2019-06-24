import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import Sequelize from 'sequelize';

import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES } from '../../constants';

const permissions = require('tc-core-library-js').middleware.permissions;


const addProjectPhaseValidations = {
  body: Joi.object().keys({
    name: Joi.string().required(),
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
  validate(addProjectPhaseValidations),
  // check permission
  permissions('project.addProjectPhase'),
  // do the real work
  (req, res, next) => {
    const data = req.body;
    // default values
    const projectId = _.parseInt(req.params.projectId);
    _.assign(data, {
      projectId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    let newProjectPhase = null;
    let otherUpdated = null;
    models.sequelize.transaction(() => {
      req.log.debug('Create Phase - Starting transaction');
      return models.Project.findOne({
        where: { id: projectId, deletedAt: { $eq: null } },
      })
        .then((existingProject) => {
          if (!existingProject) {
            const err = new Error(`active project not found for project id ${projectId}`);
            err.status = 404;
            throw err;
          }
          if (data.startDate !== null && data.endDate !== null && data.startDate > data.endDate) {
            const err = new Error('startDate must not be after endDate.');
            err.status = 400;
            throw err;
          }
          return models.ProjectPhase
            .create(data)
            .then((_newProjectPhase) => {
              newProjectPhase = _.cloneDeep(_newProjectPhase);
              req.log.debug('new project phase created (id# %d, name: %s)',
                newProjectPhase.id, newProjectPhase.name);

              newProjectPhase = newProjectPhase.get({ plain: true });
              newProjectPhase = _.omit(newProjectPhase, ['deletedAt', 'deletedBy', 'utm']);
            });
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
        .then((updatedCount) => {
          if (updatedCount) {
            return models.ProjectPhase.findAll({
              where: {
                projectId,
                id: { $ne: newProjectPhase.id },
                order: { $gte: newProjectPhase.order },
              },
              order: [['updatedAt', 'DESC']],
              limit: updatedCount[0],
            });
          }
          return Promise.resolve();
        })
        .then((_otherUpdated) => {
          otherUpdated = _otherUpdated || [];
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
        });
    })
      .then(() => {
        // Send events to buses
        req.log.debug('Sending event to RabbitMQ bus for project phase %d', newProjectPhase.id);
        req.app.services.pubsub.publish(EVENT.ROUTING_KEY.PROJECT_PHASE_ADDED,
          newProjectPhase,
          { correlationId: req.id },
        );

        // emit the event
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_PHASE_ADDED,
          RESOURCES.PHASE,
          newProjectPhase);

        // emit the event for other phase order updated
        _.map(otherUpdated, phase =>
          util.sendResourceToKafkaBus(
            req,
            EVENT.ROUTING_KEY.PROJECT_PHASE_UPDATED,
            RESOURCES.PHASE,
            _.assign(_.pick(phase.toJSON(), 'id', 'order', 'updatedBy', 'updatedAt'))),
        );

        res.status(201).json(newProjectPhase);
      })
      .catch((err) => {
        util.handleError('Error creating project phase', err, req, next);
      });
  },

];
