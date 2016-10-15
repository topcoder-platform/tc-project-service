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

describe('Project members delete', () => {
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

    it('should return 403 if user not found', done =>  {
      request(server)
          .delete('/v4/projects/' + project1.id + '/members/8888888')
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.copilot
          })
          .send({ param: {userId: 1, projectId: project1.id, role: 'customer'}})
          .expect(403, done)
    })

    it('should return 204 if copilot user has access to the project', done =>  {
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
            done()
            // models.ProjectMember
            //     .count({where: { projectId: project1.id, deletedAt: { $eq: null } }})
            //     .then(count=>{
            //       console.log(JSON.stringify(count, null, 2))
            //       count.length.should.equal(1)
            //       done()
            //     })
            //     .catch(err=>done(err))

          })
    })

    it('should return 204 if copilot user is trying to remove a manager', done =>  {
      request(server)
          .delete('/v4/projects/' + project1.id + '/members/' + member2.id)
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.copilot
          })
          .expect(403, done)
    })
  })
})
