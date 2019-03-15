/* eslint-disable */
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
var targetUrl = 'http://localhost:8001/v4/';
var destUrl = targetUrl + 'projects/';
var destTimelines = targetUrl;

console.log('Getting metadata from DEV environment...');

axios.get(url, {
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
      'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBVc2VyIiwiYWRtaW5pc3RyYXRvciJdLCJpc3MiOiJodHRwczovL2FwaS50b3Bjb2Rlci1kZXYuY29tIiwiaGFuZGxlIjoidGVzdDEiLCJleHAiOjI1NjMwNzY2ODksInVzZXJJZCI6IjQwMDUxMzMzIiwiaWF0IjoxNDYzMDc2MDg5LCJlbWFpbCI6InRlc3RAdG9wY29kZXIuY29tIiwianRpIjoiYjMzYjc3Y2QtYjUyZS00MGZlLTgzN2UtYmViOGUwYWU2YTRhIn0.wKWUe0-SaiFVN-VR_-GwgFlvWaDkSbc8H55ktb9LAVw'
    }

    let promises = _(data.result.content.projectTypes).map(pt=>{
      return axios
        .post(destUrl+'metadata/projectTypes',{param:pt}, {headers:headers})
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.result.content.message', '');
          console.log(`Failed to create projectType with key=${pt.key}.`, errMessage)
        })
    });

    await Promise.all(promises);

    promises = _(data.result.content.productCategories).map(pt=>{
      return axios
        .post(destUrl+'metadata/productCategories',{param:pt}, {headers:headers})
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.result.content.message', '');
          console.log(`Failed to create productCategory with key=${pt.key}.`, errMessage)
        })
    });

    await Promise.all(promises);

    promises = _(data.result.content.projectTemplates).map(pt=>{
      return axios
        .post(destUrl+'metadata/projectTemplates',{param:pt}, {headers:headers})
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.result.content.message', '');
          console.log(`Failed to create projectTemplate with id=${pt.id}.`, errMessage)
        })
    });

    await Promise.all(promises);

    promises = _(data.result.content.productTemplates).map(pt=>{
      return axios
        .post(destUrl+'metadata/productTemplates',{param:pt}, {headers:headers})
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.result.content.message', '');
          console.log(`Failed to create productTemplate with id=${pt.id}.`, errMessage)
        })
    });

    await Promise.all(promises);

    await Promise.each(data.result.content.milestoneTemplates,pt=> (
      axios
        .post(destTimelines+'timelines/metadata/milestoneTemplates',{param:pt}, {headers:headers})
        .catch((err) => {
          const errMessage = _.get(err, 'response.data.result.content.message', '');
          console.log(`Failed to create milestoneTemplate with id=${pt.id}.`, errMessage)
        })
    ));

    // handle success
    console.log('Done');
  }).catch(err=>{
    console.error(err && err.response ? err.response : err);
  });
