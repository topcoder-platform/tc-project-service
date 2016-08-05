'use strict'
import _ from 'lodash'
import chai, { expect} from 'chai'
import sinon from 'sinon'
import request from 'supertest'

import models from '../../models'
import util from '../../util'
import server from '../../app'
import testUtil from '../../tests/util'

var should = chai.should()

describe('Project', λ => {
  var project1, member1
  before(done =>  {
    testUtil.clearDb()
      .then(() => {
        var p1 = models.Project.create({
          type: 'generic',
          billingAccountId: '1',
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
          }).then((pm) => {
            member1 = pm
            done()
          })
        })
      })
  })

  after(done =>  {
    testUtil.clearDb(done)
  })

  describe('DELETE /projects/{id}/members/{id}', () => {
    it('should return 403 if user does not have permissions', done =>  {
      request(server)
        .delete('/v4/projects/' + project1.id + '/members/' + member1.id)
        .set({
          'Authorization': 'Bearer ' + testUtil.jwts.member
        })
        .send({ param: {userId: 1, projectId: project1.id, role: 'customer'}})
        .expect(403, done)
    })

    it('should return 204 if user has access to the project', done =>  {
      request(server)
      .delete('/v4/projects/' + project1.id + '/members/' + member1.id)
        .set({
          'Authorization': 'Bearer ' + testUtil.jwts.copilot
        })
        .expect(204, done)
    })
  })
})
