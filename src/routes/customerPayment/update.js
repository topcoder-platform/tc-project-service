/**
 * API to update a customer payment reference, referenceId fields.
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import * as _ from 'lodash';
import models from '../../models';
import { EVENT, RESOURCES } from '../../constants';
import util from '../../util';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    id: Joi.number().integer().positive().required(),
  },
  body: Joi.object().keys({
    reference: Joi.string().optional(),
    referenceId: Joi.string().optional(),
  }).required(),
};

module.exports = [
  validate(schema),
  permissions('customerPayment.edit'),
  (req, res, next) => {
    models.CustomerPayment.findOne({
      where: {
        id: req.params.id,
      },
    })
      .then(
        existing =>
          new Promise((accept, reject) => {
            if (!existing) {
              // handle 404
              const err = new Error(
                `No Customer payment found for id: ${req.params.id}`,
              );
              err.status = 404;
              reject(err);
            } else {
              existing
                .update(
                  _.extend(
                    {
                      updatedBy: req.authUser.userId,
                    },
                    req.body,
                  ),
                )
                .then(accept)
                .catch(reject);
            }
          }),
      )
      .then((updated) => {
        const result = _.omit(updated.toJSON(), 'deletedAt', 'deletedBy');
        // emit the event
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.CUSTOMER_PAYMENT_UPDATED,
          RESOURCES.CUSTOMER_PAYMENT,
          result,
        );
        res.json(result);
      })
      .catch(next);
  },
];
