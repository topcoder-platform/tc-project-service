/**
 * API to delete a milestone template
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT, RESOURCES } from '../../constants';
import validateMilestoneTemplate from '../../middlewares/validateMilestoneTemplate';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    milestoneTemplateId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  validateMilestoneTemplate.validateIdParam,
  permissions('milestoneTemplate.delete'),
  (req, res, next) => models.sequelize.transaction(() =>
  // soft delete the record
    req.milestoneTemplate.update({ deletedBy: req.authUser.userId })
      .then(entity => entity.destroy()),
  )
    .then(() => {
      // emit the event
      util.sendResourceToKafkaBus(
        req,
        EVENT.ROUTING_KEY.MILESTONE_TEMPLATE_REMOVED,
        RESOURCES.MILESTONE_TEMPLATE,
        { id: req.params.milestoneTemplateId });

      res.status(204).end();
    })
    .catch(next),
];
