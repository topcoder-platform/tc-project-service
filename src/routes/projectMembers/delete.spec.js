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

describe('Project', () => {
  var project1, member1, member2
  beforeEach(done =>  {
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
            return models.ProjectMember.create({
              userId: 40051332,
              projectId: project1.id,
              role: 'copilot',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1
            }).then((pm) => {
              member1 = pm
              return models.ProjectMember.create({
                userId: 40051334,
                projectId: project1.id,
                role: 'manager',
                isPrimary: true,
                createdBy: 1,
                updatedBy: 1
              }).then((pm2) => {
                member2 = pm2
                done()
              })
            })
          })
        })
  })

  after(done =>  {
    testUtil.clearDb(done)
  })

  describe('DELETE /projects/{id}/members/{id}', () => {
    var sandbox
    beforeEach(() => {
      sandbox = sinon.sandbox.create()
    })
    afterEach(() => {
      sandbox.restore()
    })

    it('should return 403 if user does not have permissions', done =>  {
      request(server)
          .delete('/v4/projects/' + project1.id + '/members/' + member1.id)
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.member
          })
          .send({ param: {userId: 1, projectId: project1.id, role: 'customer'}})
          .expect(403, done)
    })

    it('should return 404 if user not found', done =>  {
      request(server)
          .delete('/v4/projects/' + project1.id + '/members/8888888')
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.copilot
          })
          .send({ param: {userId: 1, projectId: project1.id, role: 'customer'}})
          .expect(404, done)
    })

    it('should return 204 if copilot user has access to the project', done =>  {
      var mockHttpClient = _.merge(testUtil.mockHttpClient, {
        delete: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: true
            }
          }
        })
      })
      var deleteSpy = sinon.spy(mockHttpClient, 'delete')
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient )
      request(server)
          .delete('/v4/projects/' + project1.id + '/members/' + member1.id)
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.copilot
          })
          .expect(204)
          .end(function(err) {
            if (err) {
              return done(err)
            }
            deleteSpy.should.have.been.calledOnce
            models.ProjectMember
                .count({})
                .then(count=>{
                  count.should.equal(1)
                  done()
                })

          })
    })

    /*
    // TODO this test is no logner valid since updating direct is async
    // we should convert this test to async msg handler test
    it('should return 500 if error to remove copilot from direct project', done =>  {
      var mockHttpClient = _.merge(testUtil.mockHttpClient, {
        delete: () => Promise.reject(new Error('error message'))
      })
      var deleteSpy = sinon.spy(mockHttpClient, 'delete')
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient )
      request(server)
          .delete('/v4/projects/' + project1.id + '/members/' + member1.id)
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.copilot
          })
          .expect(500)
          .end(function(err, res) {
            if (err) {
              return done(err)
            }
            const result = res.body.result
            should.exist(result)
            result.success.should.be.false
            result.status.should.equal(500)
            result.content.message.should.equal('error message')
            deleteSpy.should.have.been.calledOnce
            done()
          })
    })
    */

    it('should return 204 if not copilot user has access to the project', done =>  {
      request(server)
          .delete('/v4/projects/' + project1.id + '/members/' + member2.id)
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.copilot
          })
          .expect(204)
          .end(function(err) {
            if (err) {
              return done(err)
            }
            models.ProjectMember
                .count({})
                .then(count=>{
                  count.should.equal(1)
                  done()
                })

          })
    })

    it('should return 204 if delete copilot user from project without direct project id', done =>  {
      models.Project.update({ directProjectId: null}, {where: {id: project1.id}})
          .then(()=>  {
                request(server)
                    .delete('/v4/projects/' + project1.id + '/members/' + member1.id)
                    .set({
                      'Authorization': 'Bearer ' + testUtil.jwts.copilot
                    })
                    .expect(204)
                    .end(function(err) {
                      if (err) {
                        return done(err)
                      }
                      models.ProjectMember
                          .count({})
                          .then(count=>{
                            count.should.equal(1)
                            return done()
                          })

                    })
              }
          )

    })
  })
})
