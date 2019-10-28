/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import request from 'supertest';
import sinon from 'sinon';
import chai from 'chai';
import models from '../../models';
import server from '../../app';
import util from '../../util';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import {
  BUS_API_EVENT,
  RESOURCES,
  USER_ROLE,
  PROJECT_MEMBER_ROLE,
  INVITE_STATUS,
  CONNECT_NOTIFICATION_EVENT,
} from '../../constants';

const should = chai.should();

describe('Project member invite update', () => {
  let project1;
  let invite1;
  let invite2;
  let invite3;

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
          lastActivityUserId: '1',
        }).then((p) => {
          project1 = p;
          // create members
          models.ProjectMember.create({
            userId: 40051334,
            projectId: project1.id,
            role: 'manager',
            isPrimary: false,
            createdBy: 1,
            updatedBy: 1,
            createdAt: '2016-06-30 00:33:07+00',
            updatedAt: '2016-06-30 00:33:07+00',
          }).then(() => {
            models.ProjectMemberInvite.create({
              projectId: project1.id,
              userId: 40051331,
              email: null,
              role: PROJECT_MEMBER_ROLE.CUSTOMER,
              status: INVITE_STATUS.PENDING,
              createdBy: 1,
              updatedBy: 1,
              createdAt: '2016-06-30 00:33:07+00',
              updatedAt: '2016-06-30 00:33:07+00',
            }).then((in1) => {
              invite1 = in1.get({
                plain: true,
              });
              models.ProjectMemberInvite.create({
                projectId: project1.id,
                userId: 40051334,
                email: null,
                role: PROJECT_MEMBER_ROLE.MANAGER,
                status: INVITE_STATUS.PENDING,
                createdBy: 1,
                updatedBy: 1,
                createdAt: '2016-06-30 00:33:07+00',
                updatedAt: '2016-06-30 00:33:07+00',
              }).then((in2) => {
                invite2 = in2.get({
                  plain: true,
                });
                models.ProjectMemberInvite.create({
                  projectId: project1.id,
                  userId: 40051332,
                  email: null,
                  role: PROJECT_MEMBER_ROLE.COPILOT,
                  status: INVITE_STATUS.REQUESTED,
                  createdBy: 1,
                  updatedBy: 1,
                  createdAt: '2016-06-30 00:33:07+00',
                  updatedAt: '2016-06-30 00:33:07+00',
                }).then((in3) => {
                  invite3 = in3.get({
                    plain: true,
                  });
                  done();
                });
              });
            });
          });
        });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('PUT /projects/{id}/members/invite', () => {
    const body = {
      status: 'accepted',
    };

    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should return 403 if user does not have permissions', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}/members/invite`)
        .send(body)
        .expect(403, done);
    });

    it('should return 404 if user has no invite', (done) => {
      request(server)
        .put(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          userId: 123,
          status: INVITE_STATUS.CANCELED,
        })
        .expect('Content-Type', /json/)
        .expect(404)
        .end(() => {
          done();
        });
    });

    it('should return 400 no userId or email is presented', (done) => {
      request(server)
        .put(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({
          status: INVITE_STATUS.CANCELED,
        })
        .expect('Content-Type', /json/)
        .expect(400)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            const errorMessage = _.get(resJson, 'message', '');
            sinon.assert.match(errorMessage, /.*userId or email should be provided/);
            done();
          }
        });
    });

    it('should return 403 if try to update MANAGER role invite with copilot', (done) => {
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
        .put(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          userId: invite2.userId,
          status: INVITE_STATUS.CANCELED,
        })
        .expect('Content-Type', /json/)
        .expect(403)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            const errorMessage = _.get(resJson, 'message', '');
            sinon.assert.match(errorMessage, /.*Project members can cancel invites only for customer/);
            done();
          }
        });
    });

    it('should return 403 if try to update others invite with CUSTOMER', (done) => {
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
                roleName: USER_ROLE.CUSTOMER,
              }],
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .put(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send({
          userId: invite2.userId,
          status: INVITE_STATUS.CANCELED,
        })
        .expect('Content-Type', /json/)
        .expect(403)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            const errorMessage = _.get(resJson, 'message', '');
            sinon.assert.match(errorMessage, /.*Project members can cancel invites only for customer/);
            done();
          }
        });
    });

    it('should return 403 if try to update COPILOT role invite with copilot', (done) => {
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
        .put(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          userId: invite3.userId,
          status: INVITE_STATUS.ACCEPTED,
        })
        .expect('Content-Type', /json/)
        .expect(403)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            const errorMessage = _.get(resJson, 'message', '');
            sinon.assert.match(errorMessage, 'Requested invites can only be updated by Copilot manager');
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

      it('should send correct BUS API messages when invite is accepted', (done) => {
        const mockHttpClient = _.merge(testUtil.mockHttpClient, {
          get: () => Promise.resolve({
            status: 200,
            data: {},
          }),
        });
        sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
        request(server)
        .put(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send({
          userId: invite1.userId,
          status: INVITE_STATUS.ACCEPTED,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.callCount.should.be.eql(5);

              /*
                Events for accepted invite
              */
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_UPDATED, sinon.match({
                resource: RESOURCES.PROJECT_MEMBER_INVITE,
                projectId: project1.id,
                userId: invite1.userId,
                status: INVITE_STATUS.ACCEPTED,
                email: null,
              })).should.be.true;

              // Check Notification Service events
              createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_MEMBER_INVITE_UPDATED, sinon.match({
                projectId: project1.id,
                userId: invite1.userId,
                status: INVITE_STATUS.ACCEPTED,
                email: null,
                isSSO: false,
              })).should.be.true;

              /*
                Events for created member (after invite acceptance)
              */
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_ADDED, sinon.match({
                resource: RESOURCES.PROJECT_MEMBER,
                projectId: project1.id,
                userId: invite1.userId,
              })).should.be.true;

              // Check Notification Service events
              createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.MEMBER_JOINED, sinon.match({
                projectId: project1.id,
                projectName: project1.name,
                userId: invite1.userId,
                initiatorUserId: 40051331,
              })).should.be.true;
              createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_TEAM_UPDATED, sinon.match({
                projectId: project1.id,
                projectName: project1.name,
                userId: invite1.userId,
                initiatorUserId: 40051331,
              })).should.be.true;

              done();
            });
          }
        });
      });
    });
  });
});
