

import _ from 'lodash';
import models from '../models';
import { PERMISSION } from './constants';

/**
 * Only users who have "UPDATE_CUSTOMER_PAYMENT" permission or create the customerPayment can confirm the customerPayment.
 *
 * @param {Object}    freq        the express request instance
 * @return {Promise}              Returns a promise
 */
module.exports = freq =>
  new Promise((resolve, reject) =>
    models.CustomerPayment.findOne({
      where: { id: freq.params.id },
    }).then((customerPayment) => {
      if (!customerPayment) {
        reject(new Error('Customer Payment not found'));
      }
      const isMachineToken = _.get(freq, 'authUser.isMachine', false);
      const tokenScopes = _.get(freq, 'authUser.scopes', []);
      if (isMachineToken) {
        if (
          _.intersection(tokenScopes, PERMISSION.UPDATE_CUSTOMER_PAYMENT.scopes)
            .length > 0
        ) {
          return resolve(true);
        }
      } else if (freq.authUser.userId === customerPayment.createdBy) {
        return resolve(true);
      } else {
        const authRoles = _.get(freq, 'authUser.roles', []).map(s =>
          s.toLowerCase(),
        );
        const requireRoles =
          PERMISSION.UPDATE_CUSTOMER_PAYMENT.topcoderRoles.map(r =>
            r.toLowerCase(),
          );
        if (_.intersection(authRoles, requireRoles).length > 0) {
          return resolve(true);
        }
      }
      return reject(
        new Error('You do not have permissions to perform this action'),
      );
    }),
  );
