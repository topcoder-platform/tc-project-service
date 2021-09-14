/* eslint-disable no-console */
/**
 * Clear the postman test data. All data created by postman e2e tests will be cleared.
 */

const axios = require('axios');
const config = require('config');
const envHelper = require('./envHelper');

console.log('Clear the Postman test data.');

/**
 * Uses axios to proxy post request
 * @param {String} jwtToken the jwt token
 * @param {String} url the url
 * @returns {Object} the response
 */
async function postRequest(jwtToken, url) {
  const response = await axios({
    method: 'post',
    url,
    data: {},
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'application/json;charset=UTF-8',
      Authorization: `Bearer ${jwtToken}`,
    },
  });
  return response;
}

/**
 * Clear the postman test data. The main function of this class.
 * @returns {void}
 */
const clearTestData = async () => {
  const token = await envHelper.getAdminToken();
  await postRequest(token, `${config.AUTOMATED_TESTING_SITE_PREFIX}/projects/internal/jobs/clean`);
};

clearTestData().then(() => {
  console.log('Completed!');
  process.exit();
}).catch((e) => {
  console.log(e);
  process.exit(1);
});

module.exports = {
  clearTestData,
};
