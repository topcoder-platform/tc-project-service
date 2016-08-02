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

describe('LIST Project', λ => {
  var project1, project2, server
  before((done) => {
    server = require('../../../server')
    clearDB()
      .then(() => {
        var p1 = models.Project.create({
          type: 'generic',
          billingAccountId: '1',
          title: 'test1',
          description: 'test project1',
          status: 'active',
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
            userId: 40051332,
            projectId: project1.id,
            role: 'copilot',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1
          })
          var pa1 = models.ProjectAttachment.create({
            title: 'Spec',
            projectId: project1.id,
            description: "specification",
            filePath: "projects/1/spec.pdf",
            contentType: "application/pdf",
            createdBy: 1,
            updatedBy: 1
          })
          return Promise.all([pm1, pm2, pa1])
        })

        var p2 = models.Project.create({
          type: 'visual_design',
          billingAccountId: '1',
          title: 'test2',
          description: 'test project2',
          status: 'draft',
          details: {},
          createdBy: 1,
          updatedBy: 1
        }).then((p) => {
          project2 = p
          return models.ProjectMember.create({
            userId: 40051332,
            projectId: project2.id,
            role: 'copilot',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1
          })
        })
        return Promise.all([p1, p2])
          .then(() => done())
      })
  })

  after((done) => {
    server.close(clearDB(done))
  })

  describe('GET /projects/', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v4/projects/')
        .expect(403, done)
    })

    it('should return 200 and no projects if user does not have access', (done) => {
      request(server)
        .get('/v4/projects/?filter=id%3Din%28'+ project2.id + '%29')
        .set({
          'Authorization': 'Bearer ' + jwts.member
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err)
          }
          res.body.result.content.should.have.lengthOf(0)
          done()
        })
    })

    it('should return the project when registerd member attempts to access the project', (done) => {
      request(server)
        .get('/v4/projects/?filter=status%3Dactive')
        .set({
          'Authorization': 'Bearer ' + jwts.copilot
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err)
          }
          var resJson = res.body.result.content
          res.body.result.metadata.totalCount.should.equal(1)
          should.exist(resJson)
          resJson.should.have.lengthOf(1)
          done()
        })
    })

    it('should return the project for administrator ', (done) => {
      request(server)
        .get('/v4/projects/?fields=id%2Cmembers.id')
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
          resJson.should.have.lengthOf(2)
          done()
        })
    })
  })

})
