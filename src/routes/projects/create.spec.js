'use strict'
import _ from 'lodash'
import chai from 'chai'
import sinon from 'sinon'
import request from 'supertest'

import util from '../../util'
import server from '../../app'
import testUtil from '../../tests/util'
import RabbitMQService from '../../services/rabbitmq'

var should = chai.should()

sinon.stub(RabbitMQService.prototype, 'init', ()=> {})
sinon.stub(RabbitMQService.prototype, 'publish', ()=> {console.log('publish called')})

describe('Project', () => {
    before(done =>  {
        testUtil.clearDb(done)
    })

    after(done =>  {
        testUtil.clearDb(done)
    })

    describe('POST /projects', () => {
        var body = {
            param: {
                type: 'generic',
                description: "test project",
                details: {},
                billingAccountId: 1,
                name: 'test project1',
                bookmarks:[{
                    title:'title1',
                    address:'address1'
                }]
            }
        }

        var sandbox
        beforeEach(() => {
            sandbox = sinon.sandbox.create()
        })
        afterEach(() => {
            sandbox.restore()
        })

        it('should return 403 if user is not authenticated', done =>  {
            request(server)
                .post("/v4/projects")
                .send(body)
                .expect(403,done)
        })

        it('should return 422 if validations dont pass', done =>  {
            let invalidBody = _.cloneDeep(body)
            delete invalidBody.param.name
            request(server)
                .post("/v4/projects")
                .set({"Authorization": "Bearer " + testUtil.jwts.member})
                .send(invalidBody)
                .expect('Content-Type', /json/)
                .expect(422,done)
        })

        it('should return 500 if error to create direct project', done =>  {
            var mockHttpClient = _.merge(testUtil.mockHttpClient, {
                post: () => Promise.reject(new Error('error message'))
            })
            sandbox.stub(util, 'getHttpClient', () => mockHttpClient )
            request(server)
                .post("/v4/projects")
                .set({"Authorization": "Bearer " + testUtil.jwts.member})
                .send(body)
                .expect('Content-Type', /json/)
                .expect(500)
                .end(function (err,res) {
                    if (err) {
                        return done(err)
                    }
                    const result = res.body.result
                    result.success.should.be.false
                    result.status.should.equal(500)
                    result.content.message.should.equal('Error creating project')
                    done()
                })
        })

        it('should return 201 if valid user and data', done =>  {
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
                                projectId: 128,
                            }
                        }
                    }
                })
            })
            sandbox.stub(util, 'getHttpClient', () => mockHttpClient )
            request(server)
                .post("/v4/projects")
                .set({"Authorization": "Bearer " + testUtil.jwts.member})
                .send(body)
                .expect('Content-Type', /json/)
                .expect(201)
                .end(function (err,res) {
                    if (err) {
                        return done(err)
                    }
                    var resJson = res.body.result.content
                    should.exist(resJson)
                    should.exist(resJson.billingAccountId)
                    should.exist(resJson.name)
                    resJson.directProjectId.should.be.eql(128)
                    resJson.status.should.be.eql('draft')
                    resJson.type.should.be.eql(body.param.type)
                    resJson.members.should.have.lengthOf(1)
                    resJson.members[0].role.should.be.eql('customer')
                    resJson.members[0].userId.should.be.eql(40051331)
                    resJson.members[0].projectId.should.be.eql(resJson.id)
                    resJson.members[0].isPrimary.should.be.truthy
                    resJson.bookmarks.should.have.lengthOf(1)
                    resJson.bookmarks[0].title.should.be.eql('title1')
                    resJson.bookmarks[0].address.should.be.eql('address1')
                    done()
                })
        })
    })
})
