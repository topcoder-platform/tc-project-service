// import _ from 'lodash';
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import SalesforceService from '../../services/salesforceService';

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
  permissions('projectBillingAccounts.view'),
  async (req, res, next) => {
    // const projectId = _.parseInt(req.params.projectId);
    const userId = req.authUser.userId;
    try {
      const { accessToken, instanceUrl } = await SalesforceService.authenticate();
      // eslint-disable-next-line
      const sql = `SELECT  Topcoder_Billing_Account__r.id, Topcoder_Billing_Account__r.TopCoder_Billing_Account_Id__c, Topcoder_Billing_Account__r.Billing_Account_Name__c, Topcoder_Billing_Account__r.Start_Date__c, Topcoder_Billing_Account__r.End_Date__c from Topcoder_Billing_Account_Resource__c tbar where UserID__c='${userId}'`;
      // and Topcoder_Billing_Account__r.TC_Connect_Project_ID__c='${projectId}'
      req.log.debug(sql);
      const billingAccounts = await SalesforceService.query(sql, accessToken, instanceUrl, req.log);
      res.json(billingAccounts);
    } catch (error) {
      req.log.error(error);
      next(error);
    }
  },
];
