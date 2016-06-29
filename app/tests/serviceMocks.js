'use strict'
var sinon = require('sinon'),
  _ = require('lodash')

module.exports = (app) => {
  _.assign(app.services, {
    pubsub: {
      publish: () => {}
    },
    es: {
      index: () => {}
    }
  })
  sinon.stub(app.services.pubsub, 'publish', ()=>{ return Promise.resolve(true) })
  sinon.stub(app.services.es, 'index', ()=>{ return Promise.resolve(true) })
}
