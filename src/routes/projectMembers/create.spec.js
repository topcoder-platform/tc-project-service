/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';

import config from 'config';
import models from '../../models';
import util from '../../util';
import server from '../../app';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import {
  USER_ROLE,
  BUS_API_EVENT,
  RESOURCES,
  CONNECT_NOTIFICATION_EVENT,
  INVITE_STATUS,
  PROJECT_MEMBER_ROLE,
} from '../../constants';

const should = chai.should();

describe('Project Members create', () => {
  let project1;
  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => {
        models.Project.create({
          type: 'generic',
          directProjectId: 1,
          billingAccountId: 1,
          name: 'test1',
          description: 'test project1',
          status: 'reviewed',
          details: {},
          createdBy: 1,
          updatedBy: 1,
          lastActivityAt: 1,
          lastActivityUserId: '1',
        }).then((p) => {
          project1 = p;
          return models.ProjectMember.create({
            userId: testUtil.userIds.member2,
            projectId: project1.id,
            role: 'manager',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          }).then(() => {
            done();
          });
        });
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
        .post(`/v5/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 201 when invited then accepted and then 404 if user is already as a member', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: (url) => {
          const testCopilot = {
            userId: 40051332,
            handle: 'test_copilot1',
            firstName: 'Firstname',
            lastName: 'Lastname',
            email: 'test_copilot1@email.com',
          };
          const testRoleName = {
            roleName: USER_ROLE.COPILOT,
          };
          const ret = {
            status: 200,
            data: {
              id: 'requesterId',
              version: 'v3',
              result: {
                success: true,
                status: 200,
                content: [],
              },
            },
          };

          if (url.indexOf('/_search') >= 0) {
            ret.data.result.content.push(testCopilot);
          } else {
            ret.data.result.content.push(testRoleName);
          }
          return Promise.resolve(ret);
        },
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post(`/v5/projects/${project1.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({
          handles: ['test_copilot1'],
          role: 'copilot',
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.success[0];
            should.exist(resJson);
            resJson.role.should.equal('copilot');
            resJson.projectId.should.equal(project1.id);
            resJson.userId.should.equal(40051332);
            should.exist(resJson.id);
            request(server)
              .patch(`/v5/projects/${project1.id}/invites/${resJson.id}`)
              .set({
                Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
              })
              .send({
                status: 'accepted',
              })
              .expect('Content-Type', /json/)
              .expect(200)
              .end((err2, res2) => {
                if (err2) {
                  done(err2);
                } else {
                  const resJson2 = res2.body;
                  should.exist(resJson2);
                  resJson2.role.should.equal('copilot');
                  resJson2.projectId.should.equal(project1.id);
                  resJson2.userId.should.equal(40051332);

                  request(server)
                    .patch(`/v5/projects/${project1.id}/invites/${resJson.id}`)
                    .set({
                      Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
                    })
                    .send({
                      status: 'accepted',
                    })
                    .expect('Content-Type', /json/)
                    .expect(404)
                    .end((err3, res3) => {
                      if (err3) {
                        done(err3);
                      } else {
                        const errorMessage = _.get(res3.body, 'message', '');
                        sinon.assert.match(errorMessage, /.*invite not found for project id 1, inviteId/);
                        done();
                      }
                    });
                }
              });
          }
        });
    });

    it('should return 201 and register customer member', (done) => {
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
        .post(`/v5/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.role.should.equal('manager');
            resJson.isPrimary.should.be.truthy;
            resJson.projectId.should.equal(project1.id);
            resJson.userId.should.equal(40051334);
            done();
          }
        });
    });

    it('should add another user as "manager" using M2M token with "write:project-members" scope', (done) => {
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
        .post(`/v5/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.m2m['write:project-members']}`,
        })
        .send({
          userId: testUtil.userIds.manager,
          role: 'manager',
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.role.should.equal('manager');
            resJson.isPrimary.should.be.truthy;
            resJson.projectId.should.equal(project1.id);
            resJson.userId.should.equal(40051334);
            resJson.createdBy.should.equal(config.DEFAULT_M2M_USERID);
            done();
          }
        });
    });

    it('should return 201 and register admin as manager', (done) => {
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
        .post(`/v5/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.role.should.equal('manager');
            resJson.isPrimary.should.be.truthy;
            resJson.projectId.should.equal(project1.id);
            resJson.userId.should.equal(40051333);
            done();
          }
        });
    });

    it('should return 401 if register admin as role other than manager (copilot) ', (done) => {
      request(server)
        .post(`/v5/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ role: PROJECT_MEMBER_ROLE.COPILOT })
        .expect('Content-Type', /json/)
        .expect(401, done);
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

      it('should send correct BUS API messages when a manager added', (done) => {
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
          .post(`/v5/projects/${project1.id}/members/`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.manager}`,
          })
          .expect(201)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(3);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_ADDED, sinon.match({
                  resource: RESOURCES.PROJECT_MEMBER,
                  projectId: project1.id,
                  userId: 40051334,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.MEMBER_JOINED_MANAGER).should.be.true;
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_TEAM_UPDATED, sinon.match({
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

      it('should send correct BUS API messages when copilot added', (done) => {
        const mockHttpClient = _.merge(testUtil.mockHttpClient, {
          get: (url) => {
            const testCopilot = {
              userId: 40051332,
              handle: 'test_copilot1',
              firstName: 'Firstname',
              lastName: 'Lastname',
              email: 'test_copilot1@email.com',
            };
            const testRoleName = {
              roleName: USER_ROLE.COPILOT,
            };
            const ret = {
              status: 200,
              data: {
                id: 'requesterId',
                version: 'v3',
                result: {
                  success: true,
                  status: 200,
                  content: [],
                },
              },
            };

            if (url.indexOf('/_search') >= 0) {
              ret.data.result.content.push(testCopilot);
            } else {
              ret.data.result.content.push(testRoleName);
            }
            return Promise.resolve(ret);
          },
        });
        sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
        request(server)
          .post(`/v5/projects/${project1.id}/invites`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.member2}`,
          })
          .send({
            handles: ['test_copilot1'],
            role: 'copilot',
          })
          .expect(201)
          .end((err, inviteRes) => {
            if (err) {
              done(err);
            } else {
              const inviteResJson = inviteRes.body.success[0];
              should.exist(inviteResJson);
              should.exist(inviteResJson.id);
              request(server)
                .patch(`/v5/projects/${project1.id}/invites/${inviteResJson.id}`)
                .set({
                  Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
                })
                .send({
                  status: 'accepted',
                })
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err2) => {
                  if (err2) {
                    done(err2);
                  } else {
                    testUtil.wait(() => {
                      createEventSpy.callCount.should.equal(7);

                      /*
                    Copilot invitation requested
                  */
                      createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED, sinon.match({
                        resource: RESOURCES.PROJECT_MEMBER_INVITE,
                        projectId: project1.id,
                        userId: 40051332,
                        email: null,
                      })).should.be.true;

                      // Check Notification Service events
                      createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_MEMBER_INVITE_REQUESTED)
                        .should.be.true;

                      /*
                    Copilot invitation accepted
                  */
                      createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_UPDATED, sinon.match({
                        resource: RESOURCES.PROJECT_MEMBER_INVITE,
                        projectId: project1.id,
                        userId: 40051332,
                        status: INVITE_STATUS.ACCEPTED,
                        email: null,
                      })).should.be.true;

                      createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_ADDED, sinon.match({
                        resource: RESOURCES.PROJECT_MEMBER,
                        projectId: project1.id,
                        userId: 40051332,
                      })).should.be.true;

                      // Check Notification Service events
                      createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_MEMBER_INVITE_UPDATED)
                        .should.be.true;
                      createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.MEMBER_JOINED_COPILOT).should.be.true;
                      createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_TEAM_UPDATED, sinon.match({
                        projectId: project1.id,
                        projectName: project1.name,
                        projectUrl: `https://local.topcoder-dev.com/projects/${project1.id}`,
                        userId: 40051332,
                        initiatorUserId: testUtil.userIds.connectAdmin,
                      })).should.be.true;
                      done();
                    });
                  }
                });
            }
          });
      });
    });
  });
});
