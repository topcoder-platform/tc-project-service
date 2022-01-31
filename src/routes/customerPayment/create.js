/**
 * API to add a customer payment
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import { CUSTOMER_PAYMENT_CURRENCY } from '../../constants';
import { createCustomerPayment } from '../../services/customerPaymentService';

const permissions = tcMiddleware.permissions;

const schema = {
  body: Joi.object().keys({
    receiptEmail: Joi.string().email(),
    amount: Joi.number().integer().min(1).required(),
    currency: Joi.string().valid(_.values(CUSTOMER_PAYMENT_CURRENCY)).default(CUSTOMER_PAYMENT_CURRENCY.USD),
    paymentMethodId: Joi.string().required(),
    reference: Joi.string().optional(),
    referenceId: Joi.string().optional(),
  }).required(),
};

module.exports = [
  validate(schema),
  permissions('customerPayment.create'),
  (req, res, next) => {
    const { amount, currency, reference, referenceId, paymentMethodId, receiptEmail } = req.body;
    createCustomerPayment(
      amount,
      currency,
      paymentMethodId,
      reference,
      referenceId,
      receiptEmail,
      req.authUser.userId,
      req,
    )
      .then((result) => {
        // Write to the response
        res.status(201).json(result);
        return Promise.resolve();
      })
      .catch(next);
  },
];
