'use strict'

var chai = require('chai'),
  expect = chai.expect,
  should = chai.should(),
  _ = require('lodash'),
  sinon = require('sinon'),
  request = require('supertest'),
  models = require('../../../app/models')

var jwts = {
  // userId = 40051331
  member: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6W10sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLmNvbSIsImhhbmRsZSI6InRlc3QxIiwiZXhwIjoyNTYzMDc2Njg5LCJ1c2VySWQiOiI0MDA1MTMzMSIsImlhdCI6MTQ2MzA3NjA4OSwiZW1haWwiOiJ0ZXN0QHRvcGNvZGVyLmNvbSIsImp0aSI6ImIzM2I3N2NkLWI1MmUtNDBmZS04MzdlLWJlYjhlMGFlNmE0YSJ9.p13tStpp0A1RJjYJ2axSKCTx7lyWIS3kYtCvs8u88WM',
  // userId = 40051332
  copilot: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJjb3BpbG90Il0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLmNvbSIsImhhbmRsZSI6InRlc3QxIiwiZXhwIjoyNTYzMDc2Njg5LCJ1c2VySWQiOiI0MDA1MTMzMiIsImlhdCI6MTQ2MzA3NjA4OSwiZW1haWwiOiJ0ZXN0QHRvcGNvZGVyLmNvbSIsImp0aSI6ImIzM2I3N2NkLWI1MmUtNDBmZS04MzdlLWJlYjhlMGFlNmE0YSJ9.tY_eE9fjtKQ_Hp9XPwmhwMaaTdOYKoR09tdGgvZ8RLw',
  // userId = 40051333
  admin: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJhZG1pbmlzdHJhdG9yIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLmNvbSIsImhhbmRsZSI6InRlc3QxIiwiZXhwIjoyNTYzMDc2Njg5LCJ1c2VySWQiOiI0MDA1MTMzMyIsImlhdCI6MTQ2MzA3NjA4OSwiZW1haWwiOiJ0ZXN0QHRvcGNvZGVyLmNvbSIsImp0aSI6ImIzM2I3N2NkLWI1MmUtNDBmZS04MzdlLWJlYjhlMGFlNmE0YSJ9.uiZHiDXF-_KysU5tq-G82oBTYBR0gV_w-svLX_2O6ts'
}

/**
 * Clear the db data
 */
function clearDB(done) {
  return models.sequelize.sync({
      force: true
    })
    .then(() => {
      return models.Project.truncate({
        cascade: true,
        logging: false
      })
    })
    .then(() => {
      return models.ProjectMember.truncate({
        cascade: true,
        logging: false
      })
    })
    .then(() => {
      if (done) done()
    })
}

describe('Project', λ => {
  var project1, member1, server
  before((done) => {
    server = require('../../../server')
    clearDB()
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
        }).then((p) => {
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

  after((done) => {
    server.close(clearDB(done))
  })

  describe('DELETE /projects/{id}/members/{id}', () => {
    it('should return 403 if user does not have permissions', (done) => {
      request(server)
        .delete('/v4/projects/' + project1.id + '/members/' + member1.id)
        .set({
          'Authorization': 'Bearer ' + jwts.member
        })
        .send({ param: {userId: 1, projectId: project1.id, role: 'customer'}})
        .expect(403, done)
    })

    it('should return 204 if user has access to the project', (done) => {
      request(server)
      .delete('/v4/projects/' + project1.id + '/members/' + member1.id)
        .set({
          'Authorization': 'Bearer ' + jwts.copilot
        })
        .expect(204, done)
    })
  })
})
