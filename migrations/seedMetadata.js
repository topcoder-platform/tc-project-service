/* eslint-disable */
const _ = require('lodash')
const axios = require('axios');
const Promise = require('bluebird');


var url = 'https://api.topcoder-dev.com/v4/projects/metadata';
var targetUrl = 'http://localhost:8001/v4/';
var destUrl = targetUrl + 'projects/';
var destTimelines = targetUrl;

axios.get(url)
  .then(async function (response) {
    let data = response.data;

    var headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBVc2VyIiwiYWRtaW5pc3RyYXRvciJdLCJpc3MiOiJodHRwczovL2FwaS50b3Bjb2Rlci1kZXYuY29tIiwiaGFuZGxlIjoidGVzdDEiLCJleHAiOjI1NjMwNzY2ODksInVzZXJJZCI6IjQwMDUxMzMzIiwiaWF0IjoxNDYzMDc2MDg5LCJlbWFpbCI6InRlc3RAdG9wY29kZXIuY29tIiwianRpIjoiYjMzYjc3Y2QtYjUyZS00MGZlLTgzN2UtYmViOGUwYWU2YTRhIn0.wKWUe0-SaiFVN-VR_-GwgFlvWaDkSbc8H55ktb9LAVw' 
    }


    let promises = _(data.result.content.projectTypes).map(pt=>{
      return axios.post(destUrl+'metadata/projectTypes',{param:pt}, {headers:headers})
    });
    try{
      await Promise.all(promises);
    }catch(ex){
      //ignore the error
    }

    promises = _(data.result.content.projectTemplates).map(pt=>{
      return axios.post(destUrl+'metadata/projectTemplates',{param:pt}, {headers:headers})
    });
    try{
      await Promise.all(promises);
    }catch(ex){
      //ignore the error
    }

    promises = _(data.result.content.productCategories).map(pt=>{
      return axios.post(destUrl+'metadata/productCategories',{param:pt}, {headers:headers})
    });
    try{
      await Promise.all(promises);
    }catch(ex){
      //ignore the error
    }

    promises = _(data.result.content.productTemplates).map(pt=>{
      return axios.post(destUrl+'metadata/productTemplates',{param:pt}, {headers:headers})
    });
    try{
      await Promise.all(promises);
    }catch(ex){
      //ignore the error
    }

    await Promise.each(data.result.content.milestoneTemplates,pt=>{
      return new Promise((resolve,reject)=>{
        axios.post(destTimelines+'timelines/metadata/milestoneTemplates',{param:pt}, {headers:headers})
        .then(r=>resolve())
        .catch(e=>resolve()); //ignore the error
      })
    });
    


    // handle success
    console.log('Done');
  }).catch(err=>{
    console.log(err);
  });
