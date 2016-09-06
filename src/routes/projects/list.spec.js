'use strict'

import chai from 'chai'
import request from 'supertest'

import models from '../../models'
import server from '../../app'
import testUtil from '../../tests/util'

var should = chai.should()

describe('LIST Project', () => {
  var project1, project2
  before(done => {
    testUtil.clearDb()
        .then(() => {
          var p1 = models.Project.create({
            type: 'generic',
            billingAccountId: 1,
            name: 'test1',
            description: 'test project1',
            status: 'active',
            details: {},
            createdBy: 1,
            updatedBy: 1
          }).then(p => {
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
            billingAccountId: 1,
            name: 'test2',
            description: 'test project2',
            status: 'draft',
            details: {},
            createdBy: 1,
            updatedBy: 1
          }).then(p => {
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
          var p3 = models.Project.create({
            type: 'visual_design',
            billingAccountId: 1,
            name: 'test2',
            description: 'test project3',
            status: 'active',
            details: {},
            createdBy: 1,
            updatedBy: 1
          })
          return Promise.all([p1, p2, p3])
              .then(() => done())
        })
  })

  after(done => {
    testUtil.clearDb(done)
  })

  describe('GET All /projects/', () => {
    it('should return 403 if user is not authenticated', done => {
      request(server)
          .get('/v4/projects/')
          .expect(403, done)
    })

    it('should return 200 and no projects if user does not have access', done =>  {
      request(server)
          .get('/v4/projects/?filter=id%3Din%28'+ project2.id + '%29')
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.member
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

    it('should return the project when registerd member attempts to access the project', done =>  {
      request(server)
          .get('/v4/projects/?filter=status%3Ddraft')
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.copilot
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
            resJson[0].id.should.equal(project2.id)
            done()
          })
    })

    it('should return the project when project that is in active state AND does not yet have a co-pilot assigned', done =>  {
      request(server)
          .get('/v4/projects')
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.copilot
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err)
            }
            var resJson = res.body.result.content
            res.body.result.metadata.totalCount.should.equal(3)
            should.exist(resJson)
            resJson.should.have.lengthOf(3)
            done()
          })
    })

    it('should return the project for administrator ', done =>  {
      request(server)
          .get('/v4/projects/?fields=id%2Cmembers.id')
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.admin
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err)
            }
            var resJson = res.body.result.content
            should.exist(resJson)
            resJson.should.have.lengthOf(3)
            done()
          })
    })
  })

})
