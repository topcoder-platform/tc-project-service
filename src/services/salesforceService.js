/**
 * Represents the Salesforce service
 */
import _ from 'lodash';
import config from 'config';
import jwt from 'jsonwebtoken';
import util from '../util';

const axios = require('axios');

const loginBaseUrl = config.salesforce.CLIENT_AUDIENCE || 'https://login.salesforce.com';
// we are using dummy private key to fail safe when key is not provided in env
let privateKey = config.salesforce.CLIENT_KEY || 'privateKey';
privateKey = privateKey.replace(/\\n/g, '\n');

const urlEncodeForm = k =>
  Object.keys(k).reduce((a, b) => `${a}&${b}=${encodeURIComponent(k[b])}`, '');

/**
 * Helper class to abstract salesforce API calls
 */
class SalesforceService {
  /**
   * Authenticate to Salesforce with pre-configured credentials
   * @returns {{accessToken: String, instanceUrl: String}} the result
   */
  static authenticate() {
    const jwtToken = jwt.sign({}, privateKey, {
      expiresIn: '1h', // any expiration
      issuer: config.salesforce.CLIENT_ID,
      audience: config.salesforce.CLIENT_AUDIENCE,
      subject: config.salesforce.SUBJECT,
      algorithm: 'RS256',
    });
    return axios({
      method: 'post',
      url: `${loginBaseUrl}/services/oauth2/token`,
      data: urlEncodeForm({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtToken,
      }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }).then(res => ({
      accessToken: res.data.access_token,
      instanceUrl: res.data.instance_url,
    }));
  }

  /**
   * Run the query statement
   * @param {String} sql the Saleforce sql statement
   * @param {String} accessToken the access token
   * @param {String} instanceUrl the salesforce instance url
   * @param {Object} logger logger to be used for logging
   * @returns {{totalSize: Number, done: Boolean, records: Array}} the result
   */
  static queryUserBillingAccounts(sql, accessToken, instanceUrl, logger) {
    return axios({
      url: `${instanceUrl}/services/data/v37.0/query?q=${sql}`,
      method: 'get',
      headers: { authorization: `Bearer ${accessToken}` },
    }).then((res) => {
      if (logger) {
        logger.debug(_.get(res, 'data.records', []));
      }
      const billingAccounts = _.get(res, 'data.records', []).map(o => ({
        sfBillingAccountId: _.get(o, 'Topcoder_Billing_Account__r.Id'),
        tcBillingAccountId: util.parseIntStrictly(
          _.get(o, 'Topcoder_Billing_Account__r.TopCoder_Billing_Account_Id__c'),
          10,
          null, // fallback to null if cannot parse
        ),
        name: _.get(o, `Topcoder_Billing_Account__r.${config.get('sfdcBillingAccountNameField')}`),
        startDate: _.get(o, 'Topcoder_Billing_Account__r.Start_Date__c'),
        endDate: _.get(o, 'Topcoder_Billing_Account__r.End_Date__c'),
      }));
      return billingAccounts;
    });
  }

  /**
   * Run the query statement
   * @param {String} sql the Saleforce sql statement
   * @param {String} accessToken the access token
   * @param {String} instanceUrl the salesforce instance url
   * @param {Object} logger logger to be used for logging
   * @returns {{totalSize: Number, done: Boolean, records: Array}} the result
   */
  static queryBillingAccount(sql, accessToken, instanceUrl, logger) {
    return axios({
      url: `${instanceUrl}/services/data/v37.0/query?q=${sql}`,
      method: 'get',
      headers: { authorization: `Bearer ${accessToken}` },
    }).then((res) => {
      if (logger) {
        logger.debug(_.get(res, 'data.records', []));
      }
      const billingAccounts = _.get(res, 'data.records', []).map(o => ({
        tcBillingAccountId: util.parseIntStrictly(
          _.get(o, 'TopCoder_Billing_Account_Id__c'),
          10,
          null, // fallback to null if cannot parse
        ),
        markup: _.get(o, config.get('sfdcBillingAccountMarkupField')),
        active: _.get(o, config.get('sfdcBillingAccountActiveField')),
      }));
      return billingAccounts.length > 0 ? billingAccounts[0] : {};
    });
  }
}

export default SalesforceService;
