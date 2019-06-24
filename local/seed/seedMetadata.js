const _ = require('lodash')
const axios = require('axios');
const Promise = require('bluebird');

if (!process.env.CONNECT_USER_TOKEN) {
  console.error('This script requires environment variable CONNECT_USER_TOKEN to be defined. Login to http://connect.topcoder-dev.com and get your user token from the requests headers.')
  process.exit(1);
}

// we need to know any logged in Connect user token to retrieve data from DEV
const CONNECT_USER_TOKEN = process.env.CONNECT_USER_TOKEN;

var url = 'https://api.topcoder-dev.com/v4/projects/metadata';

module.exports = (targetUrl, token) => {
  var destUrl = targetUrl + 'projects/';
  var destTimelines = targetUrl;

  console.log('Getting metadata from DEV environment...');
  return axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONNECT_USER_TOKEN}`
    }
  })
  .catch((err) => {
    const errMessage = _.get(err, 'response.data.result.content.message');
    throw errMessage ? new Error('Error during obtaining data from DEV: ' + errMessage) : err
  })
  .then(async function (response) {
    let data = response.data;

    console.log('Creating metadata objects locally...');

    var headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    }

    let promises = _(data.result.content.projectTypes).map(pt=>{
      return axios
        .post(destUrl+'metadata/projectTypes', pt, {headers:headers})
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.message', '');
          console.log(`Failed to create projectType with key=${pt.key}.`, errMessage)
        })
    });

    await Promise.all(promises);

    promises = _(data.result.content.productCategories).map(pt=>{
      return axios
        .post(destUrl+'metadata/productCategories', pt, {headers:headers})
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.message', '');
          console.log(`Failed to create productCategory with key=${pt.key}.`, errMessage)
        })
    });

    await Promise.all(promises);

    promises = _(data.result.content.projectTemplates).map(pt=>{
      return axios
        .post(destUrl+'metadata/projectTemplates', pt, {headers:headers})
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.message', '');
          console.log(`Failed to create projectTemplate with id=${pt.id}.`, errMessage)
        })
    });

    await Promise.all(promises);

    promises = _(data.result.content.productTemplates).map(pt=>{
      return axios
        .post(destUrl+'metadata/productTemplates', pt, {headers:headers})
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.message', '');
          console.log(`Failed to create productTemplate with id=${pt.id}.`, errMessage)
        })
    });

    await Promise.all(promises);

    await Promise.each(data.result.content.milestoneTemplates,pt=> (
      axios
        .post(destTimelines+'timelines/metadata/milestoneTemplates', pt, {headers:headers})
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.message', '');
          console.log(`Failed to create milestoneTemplate with id=${pt.id}.`, errMessage)
        })
    ));

    // handle success
    console.log('Done metadata seed');
  }).catch(err=>{
    console.error(err && err.response ? err.response : err);
  });
}
