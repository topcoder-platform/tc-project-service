'use strict'
import _ from 'lodash'
import chai from 'chai'
import sinon from 'sinon'
import request from 'supertest'

import models from '../../models'
import util from '../../util'
import server from '../../app'
import testUtil from '../../tests/util'

var should = chai.should()

describe('Project Members', () => {
  var project1, project2
  before(done =>  {
    testUtil.clearDb()
        .then(() => {
          models.Project.create({
            type: 'generic',
            directProjectId: 1,
            billingAccountId: 1,
            name: 'test1',
            description: 'test project1',
            status: 'draft',
            details: {},
            createdBy: 1,
            updatedBy: 1
          }).then(p => {
            project1 = p
            // create members
            models.ProjectMember.create({
              userId: 40051332,
              projectId: project1.id,
              role: 'copilot',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1
            })
          }).then(() =>
              models.Project.create({
                type: 'generic',
                billingAccountId: 1,
                name: 'test2',
                description: 'test project2',
                status: 'draft',
                details: {},
                createdBy: 1,
                updatedBy: 1
              }).then(p2 => {
                project2 = p2
                done()
              }))
        })
  })

  after(done =>  {
    testUtil.clearDb(done)
  })

  describe('POST /projects/{id}/members/', () => {
    var sandbox
    beforeEach(() => {
      sandbox = sinon.sandbox.create()
    })
    afterEach(() => {
      sandbox.restore()
    })

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

    it('should return 201 and register copilot member for project with direct project id', done =>  {
      request(server)
          .post('/v4/projects/' + project2.id + '/members/')
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.admin
          })
          .send({ param: {userId: 1, role: 'copilot'}})
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err)
            }
            var resJson = res.body.result.content
            should.exist(resJson)
            resJson.role.should.equal('copilot')
            resJson.isPrimary.should.be.truthy
            resJson.projectId.should.equal(project2.id)
            resJson.userId.should.equal(1)
            done()
          })
    })

    it('should return 201 and register customer member', done =>  {
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

    it('should return 500 if error to add copilot', done =>  {
      var mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.reject(new Error('error message'))
      })
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient )
      request(server)
          .post('/v4/projects/' + project1.id + '/members/')
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.copilot
          })
          .send({ param: {userId: 2, role: 'copilot'}})
          .expect('Content-Type', /json/)
          .expect(500)
          .end(function(err, res) {
            if (err) {
              return done(err)
            }
            const result = res.body.result
            result.success.should.be.false
            result.status.should.equal(500)
            result.content.message.should.equal('error message')
            done()
          })
    })

    it('should return 201 and register copilot member', done =>  {
      var mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                copilotProjectId: 2
              }
            }
          }
        })
      })
      var postSpy = sinon.spy(mockHttpClient, 'post')
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient )
      request(server)
          .post('/v4/projects/' + project1.id + '/members/')
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.copilot
          })
          .send({ param: {userId: 3, role: 'copilot'}})
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function(err, res) {
            if (err) {
              return done(err)
            }
            var resJson = res.body.result.content
            should.exist(resJson)
            resJson.role.should.equal('copilot')
            resJson.isPrimary.should.be.truthy
            resJson.projectId.should.equal(project1.id)
            resJson.userId.should.equal(3)
            postSpy.should.have.been.calledOnce
            done()
          })
    })
  })
})
