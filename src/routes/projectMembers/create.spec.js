/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';

import models from '../../models';
import util from '../../util';
import server from '../../app';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import { USER_ROLE, PROJECT_MEMBER_ROLE, BUS_API_EVENT } from '../../constants';

const should = chai.should();

describe('Project Members create', () => {
  let project1;
  let project2;
  beforeEach((done) => {
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
          updatedBy: 1,
          lastActivityAt: 1,
          lastActivityUserId: 1,
        }).then((p) => {
          project1 = p;
          // create members
          models.ProjectMember.create({
            userId: 40051332,
            projectId: project1.id,
            role: 'copilot',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          });
        }).then(() =>
          models.Project.create({
            type: 'generic',
            billingAccountId: 1,
            name: 'test2',
            description: 'test project2',
            status: 'reviewed',
            details: {},
            createdBy: 1,
            updatedBy: 1,
            lastActivityAt: 1,
            lastActivityUserId: 1,
          }).then((p2) => {
            project2 = p2;
            done();
          }));
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects/{id}/members/', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should return 403 if user does not have permissions', (done) => {
      request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send({
          param: {
            userId: 1,
            role: 'customer',
          },
        })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 400 if user is already registered', (done) => {
      request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({
          param: {
            userId: 40051332,
            role: 'customer',
          },
        })
        .expect('Content-Type', /json/)
        .expect(400)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            res.body.result.status.should.equal(400);
            done();
          }
        });
    });

    it('should return 201 and register copilot member for project', (done) => {
      request(server)
        .post(`/v4/projects/${project2.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            userId: 1,
            role: 'copilot',
          },
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.role.should.equal('copilot');
            resJson.isPrimary.should.be.truthy;
            resJson.projectId.should.equal(project2.id);
            resJson.userId.should.equal(1);
            server.services.pubsub.publish.calledWith('project.member.added').should.be.true;
            done();
          }
        });
    });

    it('should return 201 and register customer member', (done) => {
      request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            userId: 1,
            role: 'customer',
          },
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.role.should.equal('customer');
            resJson.isPrimary.should.be.truthy;
            resJson.projectId.should.equal(project1.id);
            resJson.userId.should.equal(1);
            server.services.pubsub.publish.calledWith('project.member.added').should.be.true;
            done();
          }
        });
    });

    /*
    // TODO this test is no logner valid since updating direct is async
    // we should convert this test to async msg handler test
    it.skip('should return 500 if error to add copilot', done =>  {
      var mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.reject(new Error('error message'))
      })
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient )
      request(server)
          .post('/v4/projects/' + project1.id + '/members/')
          .set({
            'Authorization': 'Bearer ' + testUtil.jwts.copilot
          })
          .send({ param: {userId: 2, role: 'copilot'}})
          .expect('Content-Type', /json/)
          .expect(500)
          .end(function(err, res) {
            if (err) {
              return done(err)
            }
            const result = res.body.result
            result.success.should.be.false
            result.status.should.equal(500)
            result.content.message.should.equal('error message')
            done()
          })
    })
    */

    it('should return 201 and register copilot member', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                copilotProjectId: 2,
              },
            },
          },
        }),
      });
      const postSpy = sinon.spy(mockHttpClient, 'post');
      // var amqPubSpy = sinon.spy(server.services.pubsub, 'publish')
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            userId: 3,
            role: 'copilot',
          },
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.role.should.equal('copilot');
            resJson.isPrimary.should.be.truthy;
            resJson.projectId.should.equal(project1.id);
            resJson.userId.should.equal(3);
            postSpy.should.have.been.calledOnce;
            server.services.pubsub.publish.calledWith('project.member.added').should.be.true;
            done();
          }
        });
    });

    it('should return 400 for trying to add customers as manager', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: [{
                roleName: 'Topcoder User',
              }],
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          param: {
            userId: 3,
            role: 'manager',
          },
        })
        .expect('Content-Type', /json/)
        .expect(400)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            const errorMessage = _.get(resJson, 'message', '');
            sinon.assert.match(errorMessage, /.*can't be added as a Manager/);
            done();
          }
        });
    });

    it('should return 400 for trying to add copilot as manager', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: [{
                roleName: USER_ROLE.COPILOT,
              }],
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          param: {
            userId: 3,
            role: 'manager',
          },
        })
        .expect('Content-Type', /json/)
        .expect(400)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            done();
          }
        });
    });

    it('should return 201 and register Connect Manager as manager', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: [{
                roleName: USER_ROLE.MANAGER,
              }],
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          param: {
            userId: 3,
            role: 'manager',
          },
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.role.should.equal('manager');
            resJson.isPrimary.should.be.truthy;
            resJson.projectId.should.equal(project1.id);
            resJson.userId.should.equal(3);
            server.services.pubsub.publish.calledWith('project.member.added').should.be.true;
            done();
          }
        });
    });

    it('should return 201 and register Connect Admin as manager', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: [{
                roleName: USER_ROLE.CONNECT_ADMIN,
              }],
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          param: {
            userId: 3,
            role: 'manager',
          },
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.role.should.equal('manager');
            resJson.isPrimary.should.be.truthy;
            resJson.projectId.should.equal(project1.id);
            resJson.userId.should.equal(3);
            server.services.pubsub.publish.calledWith('project.member.added').should.be.true;
            done();
          }
        });
    });

    it('should return 201 and register Topcoder Admin as manager', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: [{
                roleName: USER_ROLE.TOPCODER_ADMIN,
              }],
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          param: {
            userId: 3,
            role: 'manager',
          },
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.role.should.equal('manager');
            resJson.isPrimary.should.be.truthy;
            resJson.projectId.should.equal(project1.id);
            resJson.userId.should.equal(3);
            server.services.pubsub.publish.calledWith('project.member.added').should.be.true;
            done();
          }
        });
    });

    describe('Bus api', () => {
      let createEventSpy;

      before((done) => {
        // Wait for 500ms in order to wait for createEvent calls from previous tests to complete
        testUtil.wait(done);
      });

      beforeEach(() => {
        createEventSpy = sandbox.spy(busApi, 'createEvent');
      });

      it('sends single BUS_API_EVENT.PROJECT_TEAM_UPDATED message when manager added', (done) => {
        const mockHttpClient = _.merge(testUtil.mockHttpClient, {
          get: () => Promise.resolve({
            status: 200,
            data: {
              id: 'requesterId',
              version: 'v3',
              result: {
                success: true,
                status: 200,
                content: [{
                  roleName: USER_ROLE.MANAGER,
                }],
              },
            },
          }),
          post: () => Promise.resolve({
            status: 200,
            data: {
              id: 'requesterId',
              version: 'v3',
              result: {
                success: true,
                status: 200,
                content: {},
              },
            },
          }),
        });
        sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
        request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          param: {
            userId: 3,
            role: PROJECT_MEMBER_ROLE.MANAGER,
          },
        })
        .expect(201)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.calledTwice.should.be.true;
              createEventSpy.firstCall.calledWith(BUS_API_EVENT.MEMBER_JOINED_MANAGER);
              createEventSpy.secondCall.calledWith(BUS_API_EVENT.PROJECT_TEAM_UPDATED, sinon.match({
                projectId: project1.id,
                projectName: project1.name,
                projectUrl: `https://local.topcoder-dev.com/projects/${project1.id}`,
                userId: 40051334,
                initiatorUserId: 40051334,
              })).should.be.true;
              done();
            });
          }
        });
      });

      it('sends single BUS_API_EVENT.PROJECT_TEAM_UPDATED message when copilot added', (done) => {
        request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            userId: 3,
            role: PROJECT_MEMBER_ROLE.COPILOT,
          },
        })
        .expect(201)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.calledTwice.should.be.true;
              createEventSpy.firstCall.calledWith(BUS_API_EVENT.MEMBER_JOINED_COPILOT);
              createEventSpy.secondCall.calledWith(BUS_API_EVENT.PROJECT_TEAM_UPDATED, sinon.match({
                projectId: project1.id,
                projectName: project1.name,
                projectUrl: `https://local.topcoder-dev.com/projects/${project1.id}`,
                userId: 40051332,
                initiatorUserId: 40051332,
              })).should.be.true;
              done();
            });
          }
        });
      });

      it('sends single BUS_API_EVENT.PROJECT_TEAM_UPDATED message when customer added', (done) => {
        request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            userId: 3,
            role: PROJECT_MEMBER_ROLE.CUSTOMER,
          },
        })
        .expect(201)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.calledTwice.should.be.true;
              createEventSpy.firstCall.calledWith(BUS_API_EVENT.MEMBER_JOINED);
              createEventSpy.secondCall.calledWith(BUS_API_EVENT.PROJECT_TEAM_UPDATED, sinon.match({
                projectId: project1.id,
                projectName: project1.name,
                projectUrl: `https://local.topcoder-dev.com/projects/${project1.id}`,
                userId: 40051332,
                initiatorUserId: 40051332,
              })).should.be.true;
              done();
            });
          }
        });
      });
    });
  });
});
