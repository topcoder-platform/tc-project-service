const _ = require('lodash');
const axios = require('axios');
const Promise = require('bluebird');

if (!process.env.CONNECT_USER_TOKEN) {
  console.error('This script requires environment variable CONNECT_USER_TOKEN to be defined. Login to http://connect.topcoder-dev.com and get your user token from the requests headers.');
  process.exit(1);
}

/**
 * Iteratively goes through the object and replaces prices with random values.
 *
 * This method MUTATES object.
 *
 * @param {Object} o object
 */
function dummifyPrices(o) {
  Object.keys(o).forEach((k) => {
      if (o[k] !== null && typeof o[k] === 'object') {
        dummifyPrices(o[k]);
          return;
      }
      if (k === 'price' && typeof o[k] === 'number') {
          o[k] = 100 + Math.round(Math.random() * 10000);
      }
      if (k === 'price' && typeof o[k] === 'string') {
        o[k] = (100 + Math.round(Math.random() * 10000)).toFixed(0);
    }
  });
}

// we need to know any logged in Connect user token to retrieve data from DEV
const CONNECT_USER_TOKEN = process.env.CONNECT_USER_TOKEN;

const url = 'https://api.topcoder-dev.com/v5/projects/metadata';

module.exports = (targetUrl, token) => {
  const destUrl = `${targetUrl}projects/`;
  const destTimelines = targetUrl;

  console.log('Getting metadata from DEV environment...');
  return axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONNECT_USER_TOKEN}`,
    },
  })
  .catch((err) => {
    const errMessage = _.get(err, 'response.data.message');
    throw errMessage ? new Error(`Error during obtaining data from DEV: ${errMessage}`) : err;
  })
  .then(async (response) => {
    const data = response.data;
    dummifyPrices(data);

    console.log('Creating metadata objects locally...');

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    let promises;

    promises = _(data.forms).orderBy(['key', 'asc'], ['version', 'asc']).map((pt) => {
      const param = _.omit(pt, ['id', 'version', 'revision', 'key']);
      return axios
        .post(`${destUrl}metadata/form/${pt.key}/versions`, param, { headers })
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.message', '');
          console.log(`Failed to create form with key=${pt.key} version=${pt.version}.`, errMessage);
        });
    });

    await Promise.all(promises);

    promises = _(data.planConfigs).orderBy(['key', 'asc'], ['version', 'asc']).map((pt) => {
      const param = _.omit(pt, ['id', 'version', 'revision', 'key']);
      return axios
        .post(`${destUrl}metadata/planConfig/${pt.key}/versions`, param, { headers })
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.message', '');
          console.log(`Failed to create planConfig with key=${pt.key} version=${pt.version}.`, errMessage);
        });
    });

    await Promise.all(promises);

    promises = _(data.priceConfigs).orderBy(['key', 'asc'], ['version', 'asc']).map((pt) => {
      const param = _.omit(pt, ['id', 'version', 'revision', 'key']);
      return axios
        .post(`${destUrl}metadata/priceConfig/${pt.key}/versions`, param, { headers })
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.message', '');
          console.log(`Failed to create priceConfig with key=${pt.key} version=${pt.version}.`, errMessage);
        });
    });

    await Promise.all(promises);

    promises = _(data.projectTypes).map(pt => axios
        .post(`${destUrl}metadata/projectTypes`, pt, { headers })
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.message', '');
          console.log(`Failed to create projectType with key=${pt.key}.`, errMessage);
        }));

    await Promise.all(promises);

    promises = _(data.productCategories).map(pt => axios
        .post(`${destUrl}metadata/productCategories`, pt, { headers })
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.message', '');
          console.log(`Failed to create productCategory with key=${pt.key}.`, errMessage);
        }));

    await Promise.all(promises);

    promises = _(data.projectTemplates).map(pt => axios
        .post(`${destUrl}metadata/projectTemplates`, pt, { headers })
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.message', '');
          console.log(`Failed to create projectTemplate with id=${pt.id}.`, errMessage);
        }));

    await Promise.all(promises);

    promises = _(data.productTemplates).map(pt => axios
        .post(`${destUrl}metadata/productTemplates`, pt, { headers })
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.message', '');
          console.log(`Failed to create productTemplate with id=${pt.id}.`, errMessage);
        }));

    await Promise.all(promises);

    await Promise.each(data.milestoneTemplates, pt => (
      axios
        .post(`${destTimelines}timelines/metadata/milestoneTemplates`, pt, { headers })
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.message', '');
          console.log(`Failed to create milestoneTemplate with id=${pt.id}.`, errMessage);
        })
    ));

    // handle success
    console.log('Done metadata seed');
  }).catch((err) => {
    console.error(err && err.response ? err.response : err);
  });
};
