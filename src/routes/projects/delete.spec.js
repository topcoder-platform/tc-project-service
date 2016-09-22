'use strict'
import _ from 'lodash'
import chai from 'chai'
import sinon from 'sinon'
import request from 'supertest'

import models from '../../models'
import util from '../../util'
import server from '../../app'
import testUtil from '../../tests/util'


describe('Project', () => {
  var project1, owner, teamMember, manager, copilot
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
            let promises = [
              // owner
              models.ProjectMember.create({
                userId: 40051331,
                projectId: project1.id,
                role: 'customer',
                isPrimary: true,
                createdBy: 1,
                updatedBy: 1
              }),
              // manager
              models.ProjectMember.create({
                userId: 40051334,
                projectId: project1.id,
                role: 'manager',
                isPrimary: true,
                createdBy: 1,
                updatedBy: 1
              }),
              // copilot
              models.ProjectMember.create({
                userId: 40051332,
                projectId: project1.id,
                role: 'copilot',
                isPrimary: true,
                createdBy: 1,
                updatedBy: 1
              }),
              // team member
              models.ProjectMember.create({
                userId: 40051335,
                projectId: project1.id,
                role: 'customer',
                isPrimary: false,
                createdBy: 1,
                updatedBy: 1
              })
            ]
            Promise.all(promises)
            .then((res) => {
              owner = res[0]
              manager = res[2]
              copilot = res[3]
              teamMember = res[4]
              done()
            })
          })
        })
  })

  after(done =>  {
    testUtil.clearDb(done)
  })

  describe.only('DELETE /projects/{id}/', () => {

    it('should return 404 if copilot tries to delete the project', done =>  {
      request(server)
        .delete('/v4/projects/' + project1.id)
        .set({
          'Authorization': 'Bearer ' + testUtil.jwts.copilot
        })
        .expect(404, done)
    })


    it('should return 404 if attachment was not found', done =>  {
      request(server)
          .delete('/v4/projects/8888888')
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.member
          })
          .expect(404, done)
    })

    it('should return 204 if attachment was successfully removed', done =>  {
      request(server)
        .delete('/v4/projects/' + project1.id)
        .set({
          'Authorization': 'Bearer ' + testUtil.jwts.member
        })
        .expect(204, done())
    })
  })
})
