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
  server = require('../../../app'),
  testUtil = require('../../tests/util')

describe('Project', λ => {
  var project1
  before(done =>  {
    testUtil.clearDb(done)
  })

  after(done =>  {
    testUtil.clearDb(done)
  })

  describe('PATCH /projects', () => {
    var body = {
      param: {
        title: 'updatedProject title'
      }
    }
    before(done =>  {
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
      }).then(p => {
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

    it('should return 403 if user is not authenticated', done =>  {
      request(server)
        .patch("/v4/projects/" + project1.id)
        .send(body)
        .expect(403,done)
    })

    it('should return 200 if valid user and data', done =>  {

      request(server)
        .patch("/v4/projects/" + project1.id)
        .set({"Authorization": "Bearer " + testUtil.jwts.copilot})
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
