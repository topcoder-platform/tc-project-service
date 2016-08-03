'use strict'

var chai = require('chai'),
  expect = chai.expect,
  should = chai.should(),
  _ = require('lodash'),
  sinon = require('sinon'),
  request = require('supertest'),
  models = require('../../../app/models'),
  server = require('../../../app'),
  testUtil = require('../../tests/util')

describe('Project Members', λ => {
  var project1
  before(done =>  {
    testUtil.clearDb()
      .then(() => {
        var p1 = models.Project.create({
          type: 'generic',
          billingAccountId: '1',
          title: 'test1',
          description: 'test project1',
          status: 'draft',
          details: {},
          createdBy: 1,
          updatedBy: 1
        }).then(p => {
          project1 = p
            // create members
          var pm1 = models.ProjectMember.create({
            userId: 40051332,
            projectId: project1.id,
            role: 'copilot',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1
          }).then(() => done())

        })
      })
  })

  after(done =>  {
    testUtil.clearDb(done)
  })

  describe('POST /projects/{id}/members/', () => {
    it('should return 403 if user does not have permissions', done =>  {
      request(server)
        .post('/v4/projects/' + project1.id + '/members/')
        .set({
          'Authorization': 'Bearer ' + testUtil.jwts.member
        })
        .send({ param: {userId: 1, role: 'customer'}})
        .expect('Content-Type', /json/)
        .expect(403, done)
    })

    it('should return 400 if user is already registered', done =>  {
      request(server)
        .post('/v4/projects/' + project1.id + '/members/')
        .set({
          'Authorization': 'Bearer ' + testUtil.jwts.admin
        })
        .send({ param: {userId: 40051332, role: 'customer'}})
        .expect('Content-Type', /json/)
        .expect(400)
        .end((err, res) => {
          if (err) {
            return done(err)
          }
          res.body.result.status.should.equal(400)
          done()
        })
    })

    it('should return 201 and register member', done =>  {
      request(server)
        .post('/v4/projects/' + project1.id + '/members/')
        .set({
          'Authorization': 'Bearer ' + testUtil.jwts.copilot
        })
        .send({ param: {userId: 1, role: 'customer'}})
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err)
          }
          var resJson = res.body.result.content
          should.exist(resJson)
          resJson.role.should.equal('customer')
          resJson.isPrimary.should.be.truthy
          resJson.projectId.should.equal(project1.id)
          resJson.userId.should.equal(1)
          done()
        })
    })
  })
})
