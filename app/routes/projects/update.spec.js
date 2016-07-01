'use strict'
process.env.NODE_ENV = 'test'

var chai = require('chai'),
  expect = chai.expect,
  should = chai.should(),
  _ = require('lodash'),
  sinon = require('sinon'),
  request = require('supertest'),
  util = require('../../../app/util'),
  models = require('../../../app/models')

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
  var project1
  before((done) => {
    clearDB(done)
  })

  after((done) => {
    clearDB(done)
  })

  describe.only('PATCH /projects', () => {
    var body = {
      param: {
        title: 'updatedProject title'
      }
    }
    before((done) => {
      var p1 = models.Project.create({
        type: 'generic',
        billingAccountId: '1',
        title: 'test1',
        description: 'test project1',
        status: 'draft',
        details: {},
        createdBy: 1,
        updatedBy: 1,
        createdAt: "2016-06-30 00:33:07+00",
        updatedAt: "2016-06-30 00:33:07+00"
      }).then((p) => {
        project1 = p
        models.ProjectMember.create({
          projectId: project1.id,
          role: 'copilot',
          userId: 40051332,
          createdBy: 1,
          updatedBy: 1
        }).then(()=> done())
      })
    })

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch("/v4/projects/" + project1.id)
        .send(body)
        .expect(403,done)
    })

    it('should return 200 if valid user and data', (done) => {

      request(server)
        .patch("/v4/projects/" + project1.id)
        .set({"Authorization": "Bearer " + jwts.copilot})
        .send(body)
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function (err,res) {
          if (err) {
            return done(err)
          }
          var resJson = res.body.result.content
          should.exist(resJson)
          resJson.title.should.equal('updatedProject title')
          resJson.updatedAt.should.not.equal("2016-06-30 00:33:07+00")
          resJson.updatedBy.should.equal(40051332)
          done()
        })
    })
  })

})
