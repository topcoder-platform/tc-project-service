'use strict'
// var serverRequire = require('really-need')
import _ from 'lodash'
import chai, { expect} from 'chai'
import sinon from 'sinon'
import request from 'supertest'

import models from '../../models'
import util from '../../util'
import server from '../../app'
import testUtil from '../../tests/util'

var should = chai.should()

var body = {
  title: "Spec.pdf",
  description: "kindly do the needfool... ",
  filePath: "projects/1/spec.pdf",
  s3Bucket: "submissions-staging-dev",
  contentType: "application/pdf"
}
describe('Project Attachments', λ => {
  var project1, server
  before(done =>  {
    // mocks
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

  describe.skip('POST /projects/{id}/attachments/', () => {
    it('should return 403 if user does not have permissions', done =>  {
      request(server)
        .post('/v4/projects/' + project1.id + '/attachments/')
        .set({
          'Authorization': 'Bearer ' + testUtil.jwts.member
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(403, done)
    })

    it('should return 201 return attachment record', done =>  {
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
          'Authorization': 'Bearer ' + testUtil.jwts.copilot
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
