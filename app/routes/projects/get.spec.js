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

var server = require('../../../server')

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
  var project1, project2
  before((done) => {
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
          var pm1 = models.ProjectMember.create({
            userId: 40051331,
            projectId: project1.id,
            role: 'customer',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1
          })
          var pm2 = models.ProjectMember.create({
            userId: 40051333,
            projectId: project1.id,
            role: 'copilot',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1
          })
          return Promise.all([pm1, pm2])
        })

        var p2 = models.Project.create({
          type: 'design',
          billingAccountId: '1',
          title: 'test2',
          description: 'test project2',
          status: 'draft',
          details: {},
          createdBy: 1,
          updatedBy: 1
        }).then((p) => {
          project2 = p
        })
        return Promise.all([p1, p2])
          .then(() => done())
      })
  })

  after((done) => {
    clearDB(done)
  })

  describe('GET /projects/{id}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v4/projects/' + project2.id)
        .expect(403, done)
    })

    it('should return 404 if user does not have access to the project', (done) => {
      request(server)
        .get('/v4/projects/' + project2.id)
        .set({
          'Authorization': 'Bearer ' + jwts.member
        })
        .expect(404, done)
    })

    it('should return the project when registerd member attempts to access the project', (done) => {
      request(server)
        .get('/v4/projects/' + project1.id + '/?fields=id%2Ctitle%2Cstatus%2Cmembers.role%2Cmembers.id%2Cmembers.userId')
        .set({
          'Authorization': 'Bearer ' + jwts.member
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err)
          }
          var resJson = res.body.result.content
          should.exist(resJson)
          should.not.exist(resJson.billingAccountId)
          should.exist(resJson.title)
          resJson.status.should.be.eql('draft')
          resJson.members.should.have.lengthOf(2)
          done()
        })
    })

    it('should return the project for administrator ', (done) => {
      request(server)
        .get('/v4/projects/' + project1.id)
        .set({
          'Authorization': 'Bearer ' + jwts.admin
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err)
          }
          var resJson = res.body.result.content
          should.exist(resJson)
          done()
        })
    })
  })

})
