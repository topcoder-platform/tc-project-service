import _ from 'lodash';
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import SalesforceService from '../../services/salesforceService';
import models from '../../models';

/**
 * API to get project attachments.
 *
 */

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('projectBillingAccount.view'),
  async (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    try {
      const project = await models.Project.findOne({
        where: { id: projectId },
        attributes: ['id', 'billingAccountId'],
        raw: true,
      });
      const billingAccountId = project.billingAccountId;
      if (!billingAccountId) {
        const err = new Error('Billing Account not found');
        err.status = 404;
        throw err;
      }
      const { accessToken, instanceUrl } = await SalesforceService.authenticate();
      // eslint-disable-next-line
      const sql = `SELECT  TopCoder_Billing_Account_Id__c, Mark_Up__c from Topcoder_Billing_Account__c tba where TopCoder_Billing_Account_Id__c='${billingAccountId}'`;
      req.log.debug(sql);
      const billingAccount = await SalesforceService.queryBillingAccount(sql, accessToken, instanceUrl, req.log);
      res.json(billingAccount);
    } catch (error) {
      req.log.error(error);
      next(error);
    }
  },
];
