import config from 'config';
import * as _ from 'lodash';
import Stripe from 'stripe';
import models from '../models';
import { CUSTOMER_PAYMENT_STATUS, STRIPE_CONSTANT, EVENT, RESOURCES } from '../constants';
import util from '../util';

const stripe = Stripe(config.get('STRIPE_SECRET_KEY'), { apiVersion: '2020-08-27' });


/**
 * Get the customer payment by id.
 *
 * @param {number} id the customer payment id
 * @returns {Promise} the customer payment
 */
async function getCustomerPayment(id) {
  const customerPayment = await models.CustomerPayment.findOne({
    where: { id },
  });
  if (!customerPayment) {
    const apiErr = new Error(`Customer payment not found for id ${id}`);
    apiErr.status = 404;
    throw apiErr;
  }
  return customerPayment;
}

/**
 * Convert strip error to api error.
 *
 * @param {function} stripRequest the stripe request
 * @returns {Promise} the request result
 */
async function convertStripError(stripRequest) {
  try {
    const result = await stripRequest();
    return result;
  } catch (err) {
    if (err.code === STRIPE_CONSTANT.PAYMENT_STATE_ERROR_CODE) {
      const apiErr = new Error(err.message);
      apiErr.status = 400;
      throw apiErr;
    } else {
      const apiErr = new Error(err.message);
      apiErr.status = 500;
      throw apiErr;
    }
  }
}

/**
 * Send customer payment message to kafka.
 *
 * @param {string} event the event name
 * @param {object} customerPayment the customer payment object
 * @param {object} req the request
 * @returns {Promise} the customer payment
 */
async function sendCustomerPaymentMessage(event, customerPayment, req) {
  // Omit deletedAt, deletedBy
  const result = _.omit(customerPayment.toJSON(), 'deletedAt', 'deletedBy');
  // emit the event
  util.sendResourceToKafkaBus(
    req,
    event,
    RESOURCES.CUSTOMER_PAYMENT,
    result,
  );
  return result;
}


/**
 * Create customer payment.
 *
 * @param {number} amount the payment intent id
 * @param {string} currency the currency
 * @param {string} paymentMethodId the payment method id
 * @param {string} reference the payment method id
 * @param {string} referenceId the payment method id
 * @param {string} userId the payment method id
 * @param {object} req the request
 * @returns {Promise} the customer payment
 */
export async function createCustomerPayment(amount, currency, paymentMethodId, reference, referenceId, userId, req) {
  const intent = await convertStripError(() => stripe.paymentIntents.create({
    amount,
    currency: _.lowerCase(currency),
    payment_method: paymentMethodId,
    capture_method: STRIPE_CONSTANT.CAPTURE_METHOD,
    confirmation_method: STRIPE_CONSTANT.CONFIRMATION_METHOD,
    confirm: true,
  }));
  const customerPayment = await models.CustomerPayment.create({
    reference,
    referenceId,
    amount,
    currency,
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    status: intent.status,
    createdBy: userId,
    updatedBy: userId,
  });
  return sendCustomerPaymentMessage(EVENT.ROUTING_KEY.CUSTOMER_PAYMENT_CREATED, customerPayment, req);
}

/**
 * Confirm customer payment.
 *
 * @param {number} id the customer payment id
 * @param {string} userId the payment method id
 * @param {object} req the request
 * @returns {Promise} the customer payment
 */
export async function confirmCustomerPayment(id, userId, req) {
  const customerPayment = await getCustomerPayment(id);
  const intent = await convertStripError(() => stripe.paymentIntents.confirm(customerPayment.paymentIntentId));
  if (intent.status !== CUSTOMER_PAYMENT_STATUS.REQUIRES_CAPTURE) {
    const apiErr = new Error('You need to confirm PaymentIntent on frontend, then call api to update the status');
    apiErr.status = 400;
    throw apiErr;
  }
  const confirmedCustomerPayment = await customerPayment.update({
    status: intent.status,
    updatedBy: userId,
  });
  return sendCustomerPaymentMessage(EVENT.ROUTING_KEY.CUSTOMER_PAYMENT_UPDATED, confirmedCustomerPayment, req);
}

/**
 * Charge customer payment.
 *
 * @param {number} id the customer payment id
 * @param {string} userId the payment method id
 * @param {object} req the request
 * @returns {Promise} the customer payment
 */
export async function chargeCustomerPayment(id, userId, req) {
  const customerPayment = await getCustomerPayment(id);
  if (customerPayment.status !== CUSTOMER_PAYMENT_STATUS.REQUIRES_CAPTURE) {
    const apiErr = new Error('You need to call confirm api to update the status first');
    apiErr.status = 400;
    throw apiErr;
  }
  const intent = await convertStripError(() => stripe.paymentIntents.capture(customerPayment.paymentIntentId));
  const chargedCustomerPayment = await customerPayment.update({
    status: intent.status,
    updatedBy: userId,
  });
  return sendCustomerPaymentMessage(EVENT.ROUTING_KEY.CUSTOMER_PAYMENT_UPDATED, chargedCustomerPayment, req);
}

/**
 * Cancel customer payment.
 *
 * @param {number} id the customer payment id
 * @param {string} userId the payment method id
 * @param {object} req the request
 * @returns {Promise} the customer payment
 */
export async function cancelCustomerPayment(id, userId, req) {
  const customerPayment = await getCustomerPayment(id);
  const intent = await convertStripError(() => stripe.paymentIntents.cancel(customerPayment.paymentIntentId));
  const canceledCustomerPayment = await customerPayment.update({
    status: intent.status,
    updatedBy: userId,
  });
  return sendCustomerPaymentMessage(EVENT.ROUTING_KEY.CUSTOMER_PAYMENT_UPDATED, canceledCustomerPayment, req);
}

/**
 * Refund customer payment.
 *
 * @param {number} id the customer payment id
 * @param {string} userId the payment method id
 * @param {object} req the request
 * @returns {Promise} the customer payment
 */
export async function refundCustomerPayment(id, userId, req) {
  const customerPayment = await getCustomerPayment(id);
  const res = await convertStripError(() => stripe.refunds.create({
    payment_intent: customerPayment.paymentIntentId,
  }));
  const data = { updatedBy: userId };

  // update customer payment status
  if (res.status === STRIPE_CONSTANT.REFUNDED_SUCCEEDED) {
    data.status = CUSTOMER_PAYMENT_STATUS.REFUNDED;
  } else if (res.status === STRIPE_CONSTANT.REFUNDED_PENDING) {
    data.status = CUSTOMER_PAYMENT_STATUS.REFUND_PENDING;
  } else if (res.status === STRIPE_CONSTANT.REFUNDED_FAILED) {
    data.status = CUSTOMER_PAYMENT_STATUS.REFUND_FAILED;
  }

  const refundedCustomerPayment = await customerPayment.update(data);
  return sendCustomerPaymentMessage(EVENT.ROUTING_KEY.CUSTOMER_PAYMENT_UPDATED, refundedCustomerPayment, req);
}
