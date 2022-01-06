/**
 * API to refund a customer payment
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import { refundCustomerPayment } from '../../services/customerPaymentService';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    id: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('customerPayment.edit'),
  (req, res, next) => {
    // refund the customer payment
    refundCustomerPayment(req.params.id, req.authUser.userId, req)
      .then((updated) => {
        // Write to response
        res.json(updated);
        return Promise.resolve();
      })
      .catch(next);
  },
];
