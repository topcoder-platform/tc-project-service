/**
 * API to get a customer payment
 */
import validate from 'express-validation';
import Joi from 'joi';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    id: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  // checking by the permissions middleware
  permissions('customerPayment.view'),
  (req, res, next) => models.CustomerPayment.findOne({
    where: { id: req.params.id },
    raw: true,
  })
    .then((customerPayment) => {
      if (!customerPayment) {
        return util.handleError('customerPayment not found', null, req, next);
      }
      return res.json(_.omit(customerPayment, 'deletedAt', 'deletedBy'));
    })
    .catch(err => next(err)),
];
