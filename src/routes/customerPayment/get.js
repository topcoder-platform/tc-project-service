/**
 * API to get a customer payment
 */
import validate from 'express-validation';
import Joi from 'joi';
import config from 'config';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const permissions = tcMiddleware.permissions;

const ES_CUSTOMER_PAYMENT_INDEX = config.get(
  'elasticsearchConfig.customerPaymentIndexName',
);

const eClient = util.getElasticSearchClient();

const schema = {
  params: {
    id: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  // checking by the permissions middleware
  permissions('customerPayment.view'),
  (req, res, next) => {
    eClient
      .get({ index: ES_CUSTOMER_PAYMENT_INDEX, id: req.params.id })
      .then((doc) => {
        req.log.debug('customerPayment found in ES');
        return res.json(doc._source); // eslint-disable-line no-underscore-dangle
      })
      .catch((err) => {
        if (err.status === 404) {
          req.log.debug('No customerPayment found in ES');
          return models.CustomerPayment.findOne({
            where: { id: req.params.id },
            raw: true,
          }).then((customerPayment) =>
            res.json(_.omit(customerPayment, 'deletedAt', 'deletedBy')),
          );
        }
        return next(err);
      });
  },
];
