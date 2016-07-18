'use strict'

var chai = require('chai'),
  expect = chai.expect,
  should = chai.should(),
  _ = require('lodash'),
  sinon = require('sinon'),
  request = require('supertest'),
  util     = require('../../../app/util'),
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
    // .then(() => {
    //   return models.Project.truncate({
    //     cascade: true,
    //     logging: false
    //   })
    // })
    // .then(() => {
    //   return models.ProjectMember.truncate({
    //     cascade: true,
    //     logging: false
    //   })
    // })
    .then(() => {
      if (done) done()
    })
}

var body = {
  title: "Spec.pdf",
  description: "kindly do the needfool... ",
  filePath: "projects/1/spec.pdf",
  s3Bucket: "submissions-staging-dev",
  contentType: "application/pdf"
}
describe('Project Attachments', λ => {
  var project1, server
  before((done) => {
    server = require('../../../server')

    // mocks

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

  after((done) => {
    server.close(clearDB(done))
  })

  describe('POST /projects/{id}/attachments/', () => {
    it('should return 403 if user does not have permissions', (done) => {
      request(server)
        .post('/v4/projects/' + project1.id + '/attachments/')
        .set({
          'Authorization': 'Bearer ' + jwts.member
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(403, done)
    })

    it('should return 201 return attachment record', (done) => {
      var mockHttpClient = {
        defaults: { headers: { common: {} } },
        post: () => {
          return new Promise((resolve, reject) => {
            return resolve({
              status: 200,
              data: {
                status: 200,
                result: {
                  success: true,
                  status: 200,
                  content: {
                    filePath: "tmp/spec.pdf",
                    preSignedURL: "www.topcoder.com/media/spec.pdf"
                  }
                }
              }
            })
          })
        },
        get: () => {
          return new Promise((resolve, reject) => {
            return resolve({
              status: 200,
              data: {
                result: {
                  success: true,
                  status: 200,
                  content: {
                    filePath: "tmp/spec.pdf",
                    preSignedURL: "http://topcoder-media.s3.amazon.com/projects/1/spec.pdf"
                  }
                }
              }
            })
          })
        }
      }
      var postSpy = sinon.spy(mockHttpClient, 'post')
      var getSpy = sinon.spy(mockHttpClient, 'get')
      var stub = sinon.stub(util, 'getHttpClient', () => { return mockHttpClient } )
      // mock util s3FileTransfer
      util.s3FileTransfer = (req, source, dest) => {
        console.log(source, dest)
        return Promise.resolve(true)
      }
      request(server)
        .post('/v4/projects/' + project1.id + '/attachments/')
        .set({
          'Authorization': 'Bearer ' + jwts.copilot
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err)
          }

          var resJson = res.body.result.content
          should.exist(resJson)


          postSpy.should.have.been.calledOnce
          getSpy.should.have.been.calledOnce
          stub.restore()
          console.log(JSON.stringify(resJson, null, 2))
          // resJson.role.should.equal('customer')
          // resJson.isPrimary.should.be.truthy
          // resJson.projectId.should.equal(project1.id)
          // resJson.userId.should.equal(1)
          done()
        })
    })
  })
})
