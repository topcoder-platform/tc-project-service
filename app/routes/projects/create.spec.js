'use strict'
process.env.NODE_ENV = 'test'

var chai = require('chai'),
  expect = chai.expect,
  should = chai.should(),
  _ = require('lodash'),
  sinon = require('sinon'),
  request = require('supertest'),
  util = require('../../../app/util'),
  models = require('../../../app/models'),
  RabbitMQService = require('../../../app/services/rabbitmq')

sinon.stub(RabbitMQService.prototype, 'init', ()=> {})
sinon.stub(RabbitMQService.prototype, 'publish', ()=> {console.log('publish called')})

var jwts = {
  // userId = 40051331
  member: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6W10sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLmNvbSIsImhhbmRsZSI6InRlc3QxIiwiZXhwIjoyNTYzMDc2Njg5LCJ1c2VySWQiOiI0MDA1MTMzMSIsImlhdCI6MTQ2MzA3NjA4OSwiZW1haWwiOiJ0ZXN0QHRvcGNvZGVyLmNvbSIsImp0aSI6ImIzM2I3N2NkLWI1MmUtNDBmZS04MzdlLWJlYjhlMGFlNmE0YSJ9.p13tStpp0A1RJjYJ2axSKCTx7lyWIS3kYtCvs8u88WM",
  // userId = 40051332
  copilot: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJjb3BpbG90Il0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLmNvbSIsImhhbmRsZSI6InRlc3QxIiwiZXhwIjoyNTYzMDc2Njg5LCJ1c2VySWQiOiI0MDA1MTMzMiIsImlhdCI6MTQ2MzA3NjA4OSwiZW1haWwiOiJ0ZXN0QHRvcGNvZGVyLmNvbSIsImp0aSI6ImIzM2I3N2NkLWI1MmUtNDBmZS04MzdlLWJlYjhlMGFlNmE0YSJ9.tY_eE9fjtKQ_Hp9XPwmhwMaaTdOYKoR09tdGgvZ8RLw",
  // userId = 40051333
  admin: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJhZG1pbmlzdHJhdG9yIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLmNvbSIsImhhbmRsZSI6InRlc3QxIiwiZXhwIjoyNTYzMDc2Njg5LCJ1c2VySWQiOiI0MDA1MTMzMyIsImlhdCI6MTQ2MzA3NjA4OSwiZW1haWwiOiJ0ZXN0QHRvcGNvZGVyLmNvbSIsImp0aSI6ImIzM2I3N2NkLWI1MmUtNDBmZS04MzdlLWJlYjhlMGFlNmE0YSJ9.uiZHiDXF-_KysU5tq-G82oBTYBR0gV_w-svLX_2O6ts"
}

var server = require('../../../server')

/**
 * Clear the db data
 */
function clearDB(done) {
  models.sequelize.sync({force:true})
    .then(() => {
      return models.Project.truncate({cascade: true, logging: false})
    })
    .then(() => {
      return models.ProjectMember.truncate({cascade: true, logging: false})
    })
    .then(() => done())
}

describe('Project', λ => {

  before((done) => {
    clearDB(done)
  })

  after((done) => {
    clearDB(done)
  })

  describe('POST /projects', () => {
    var body = {
      param: {
        type: 'generic',
        description: "test project",
        details: {},
        billingAccountId: "billingAccountId",
        title: "test project1"
      }
    }

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .post("/v4/projects")
        .send(body)
        .expect(403,done)
    })

    it('should return 422 if validations dont pass', (done) => {
      let invalidBody = _.cloneDeep(body)
      delete invalidBody.param.title
      request(server)
        .post("/v4/projects")
        .set({"Authorization": "Bearer " + jwts.member})
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422,done)
    })

    it('should return 201 if valid user and data', (done) => {

      request(server)
        .post("/v4/projects")
        .set({"Authorization": "Bearer " + jwts.member})
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function (err,res) {
          if (err) {
            return done(err)
          }
          var resJson = res.body.result.content
          should.exist(resJson)
          should.exist(resJson.billingAccountId)
          should.exist(resJson.title)
          resJson.status.should.be.eql('draft')
          resJson.type.should.be.eql(body.param.type)
          resJson.members.should.have.lengthOf(1)
          resJson.members[0].role.should.be.eql('customer')
          resJson.members[0].userId.should.be.eql(40051331)
          resJson.members[0].projectId.should.be.eql(resJson.id)
          resJson.members[0].isPrimary.should.be.truthy
          done()
        })
    })
  })

})
