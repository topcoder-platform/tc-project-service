'use strict'
import _ from 'lodash'
import chai from 'chai'
import request from 'supertest'
import sinon from 'sinon'
import models from '../../models'
import server from '../../app'
import util from '../../util'
import testUtil from '../../tests/util'

const should = chai.should()

describe('Project', () => {
    let project1, member1, member2
    beforeEach(done => {
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
                    models.ProjectMember.create({
                        userId: 40051332,
                        projectId: project1.id,
                        role: 'manager',
                        isPrimary: false,
                        createdBy: 1,
                        updatedBy: 1,
                        createdAt: "2016-06-30 00:33:07+00",
                        updatedAt: "2016-06-30 00:33:07+00"
                    }).then((pm) => {
                        member1 = pm
                        models.ProjectMember.create({
                            userId: 40051333,
                            projectId: project1.id,
                            role: 'copilot',
                            isPrimary: true,
                            createdBy: 1,
                            updatedBy: 1,
                            createdAt: "2016-06-30 00:33:07+00",
                            updatedAt: "2016-06-30 00:33:07+00"
                        }).then((pm2) => pm2.reload())
                          .then((pm2) => {
                            member2 = pm2.get({plain: true})
                            done()
                        })
                    })
                })
            })
    })

    after(done => {
        testUtil.clearDb(done)
    })

    describe('PUT /projects/{id}/members/{id}', () => {
        const body = {
            param: {
                "role": "manager",
                "isPrimary": false
            }
        }

        var sandbox
        beforeEach(() => {
            sandbox = sinon.sandbox.create()
        })
        afterEach(() => {
            sandbox.restore()
        })

        it('should return 403 if user does not have permissions', done => {
            request(server)
                .patch('/v4/projects/' + project1.id + '/members/' + member2.id)
                .set({
                    'Authorization': 'Bearer ' + testUtil.jwts.member
                })
                .send(body)
                .expect(403, done)
        })

        it('should return 422 if no role', done => {
            request(server)
                .patch('/v4/projects/' + project1.id + '/members/' + member2.id)
                .set({
                    'Authorization': 'Bearer ' + testUtil.jwts.admin
                })
                .send({ param: {} })
                .expect(422, done)
        })

        it('should return 422 if role is invalid', done => {
            request(server)
                .patch('/v4/projects/' + project1.id + '/members/' + member2.id)
                .set({
                    'Authorization': 'Bearer ' + testUtil.jwts.member
                })
                .send({
                    param: {
                        "role": "wrong"
                    }
                })
                .expect(422, done)
        })

        it('should return 422 if isPrimary is invalid', done => {
            request(server)
                .patch('/v4/projects/' + project1.id + '/members/' + member2.id)
                .set({
                    'Authorization': 'Bearer ' + testUtil.jwts.member
                })
                .send({
                    param: {
                        "isPrimary": "wrong"
                    }
                })
                .expect(422, done)
        })

        it('should return 404 if not exist id', done => {
            request(server)
                .patch('/v4/projects/' + project1.id + '/members/999999')
                .set({
                    'Authorization': 'Bearer ' + testUtil.jwts.copilot
                })
                .send(body)
                .expect('Content-Type', /json/)
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err)
                    }
                    const result = res.body.result
                    result.success.should.be.false
                    result.status.should.equal(404)
                    result.content.message.should.equal(`project member not found for project id ${project1.id} and member id 999999`)
                    done()
                })
        })

        it('should return 200 if valid user and data(no isPrimary and no updates)', done => {
            request(server)
                .patch('/v4/projects/' + project1.id + '/members/' + member2.id)
                .set({
                    'Authorization': 'Bearer ' + testUtil.jwts.copilot
                })
                .send({
                    param: {
                        "role": "copilot"
                    }
                })
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err)
                    }
                    const resJson = res.body.result.content
                    should.exist(resJson)
                    resJson.role.should.equal('copilot')
                    resJson.isPrimary.should.be.true
                    new Date(resJson.updatedAt).valueOf().should.be.equal(new Date(member2.updatedAt).valueOf())
                    resJson.updatedBy.should.equal(1)
                    done()
                })

        })

        it('should return 200 if valid user(not copilot any more) for project without direct project id', done => {
            models.Project.update({ directProjectId: null}, {where: {id: project1.id}})
                .then(()=>  {
                    request(server)
                        .patch('/v4/projects/' + project1.id + '/members/' + member2.id)
                        .set({
                            'Authorization': 'Bearer ' + testUtil.jwts.copilot
                        })
                        .send(body)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err)
                            }
                            const resJson = res.body.result.content
                            should.exist(resJson)
                            resJson.role.should.equal(body.param.role)
                            resJson.isPrimary.should.be.false
                            resJson.updatedBy.should.equal(40051332)
                            done()
                        })
                    }
                )

        })

        it('should return 200 if valid user(not copilot any more) and data', done => {
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
                .patch('/v4/projects/' + project1.id + '/members/' + member2.id)
                .set({
                    'Authorization': 'Bearer ' + testUtil.jwts.copilot
                })
                .send(body)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err)
                    }
                    const resJson = res.body.result.content
                    should.exist(resJson)
                    resJson.role.should.equal(body.param.role)
                    resJson.isPrimary.should.be.false
                    resJson.updatedBy.should.equal(40051332)
                    deleteSpy.should.have.been.calledOnce
                    done()
                })
        })

        it('should return 500 if error to remove copilot from direct project', done =>  {
            var mockHttpClient = _.merge(testUtil.mockHttpClient, {
                delete: () => Promise.reject(new Error('error message'))
            })
            var deleteSpy = sinon.spy(mockHttpClient, 'delete')
            sandbox.stub(util, 'getHttpClient', () => mockHttpClient )
            request(server)
                .patch('/v4/projects/' + project1.id + '/members/' + member2.id)
                .set({
                    'Authorization': 'Bearer ' + testUtil.jwts.copilot
                })
                .send(body)
                .expect('Content-Type', /json/)
                .expect(500)
                .end(function (err, res) {
                    if (err) {
                        return done(err)
                    }
                    const result = res.body.result
                    result.success.should.be.false
                    result.status.should.equal(500)
                    result.content.message.should.equal('error message')
                    deleteSpy.should.have.been.calledOnce
                    done()
                })
        })

        it('should return 200 if valid user(become copilot) and data', done => {
            var mockHttpClient = _.merge(testUtil.mockHttpClient, {
                post: () => Promise.resolve({
                    status: 200,
                    data: {
                        id: 'requesterId',
                        version: 'v3',
                        result: {
                            success: true,
                            status: 200,
                            content: {
                                copilotProjectId: 2
                            }
                        }
                    }
                })
            })
            var postSpy = sinon.spy(mockHttpClient, 'post')
            sandbox.stub(util, 'getHttpClient', () => mockHttpClient )
            request(server)
                .patch('/v4/projects/' + project1.id + '/members/' + member1.id)
                .set({
                    'Authorization': 'Bearer ' + testUtil.jwts.copilot
                })
                .send({
                    param: {
                        "role": "copilot",
                        "isPrimary": true
                    }
                })
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err)
                    }
                    const resJson = res.body.result.content
                    should.exist(resJson)
                    resJson.role.should.equal('copilot')
                    resJson.isPrimary.should.be.true
                    resJson.updatedAt.should.not.equal("2016-06-30 00:33:07+00")
                    resJson.updatedBy.should.equal(40051332)
                    postSpy.should.have.been.calledOnce
                    models.ProjectMember.findById(member2.id)
                        .then(pm=> {
                            pm.isPrimary.should.be.false
                            pm.updatedAt.should.not.equal("2016-06-30 00:33:07+00")
                            pm.updatedBy.should.equal(40051332)
                            done()
                        })
                })
        })
    })

})
