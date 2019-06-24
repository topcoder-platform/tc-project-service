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
import { USER_ROLE, PROJECT_MEMBER_ROLE, INVITE_STATUS, BUS_API_EVENT, RESOURCES } from '../../constants';

const should = chai.should();

describe('Project Member Invite create', () => {
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
          lastActivityUserId: '1',
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

          models.ProjectMember.create({
            userId: 40051334,
            projectId: project1.id,
            role: 'manager',
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
            lastActivityUserId: '1',
          }).then((p2) => {
            project2 = p2;
            models.ProjectMember.create({
              userId: 40051332,
              projectId: project2.id,
              role: 'copilot',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1,
            }).then(() => {
              const promises = [
                models.ProjectMemberInvite.create({
                  projectId: project1.id,
                  userId: 40051335,
                  email: null,
                  role: PROJECT_MEMBER_ROLE.MANAGER,
                  status: INVITE_STATUS.PENDING,
                  createdBy: 1,
                  updatedBy: 1,
                  createdAt: '2016-06-30 00:33:07+00',
                  updatedAt: '2016-06-30 00:33:07+00',
                }),
                models.ProjectMemberInvite.create({
                  projectId: project1.id,
                  email: 'duplicate_lowercase@test.com',
                  role: PROJECT_MEMBER_ROLE.MANAGER,
                  status: INVITE_STATUS.PENDING,
                  createdBy: 1,
                  updatedBy: 1,
                  createdAt: '2016-06-30 00:33:07+00',
                  updatedAt: '2016-06-30 00:33:07+00',
                }),
                models.ProjectMemberInvite.create({
                  projectId: project1.id,
                  email: 'DUPLICATE_UPPERCASE@test.com',
                  role: PROJECT_MEMBER_ROLE.MANAGER,
                  status: INVITE_STATUS.PENDING,
                  createdBy: 1,
                  updatedBy: 1,
                  createdAt: '2016-06-30 00:33:07+00',
                  updatedAt: '2016-06-30 00:33:07+00',
                }),
                models.ProjectMemberInvite.create({
                  projectId: project1.id,
                  email: 'with.dot@gmail.com',
                  role: PROJECT_MEMBER_ROLE.MANAGER,
                  status: INVITE_STATUS.PENDING,
                  createdBy: 1,
                  updatedBy: 1,
                  createdAt: '2016-06-30 00:33:07+00',
                  updatedAt: '2016-06-30 00:33:07+00',
                }),
                models.ProjectMemberInvite.create({
                  projectId: project1.id,
                  email: 'withoutdot@gmail.com',
                  role: PROJECT_MEMBER_ROLE.MANAGER,
                  status: INVITE_STATUS.PENDING,
                  createdBy: 1,
                  updatedBy: 1,
                  createdAt: '2016-06-30 00:33:07+00',
                  updatedAt: '2016-06-30 00:33:07+00',
                }),
              ];
              Promise.all(promises).then(() => {
                done();
              });
            });
          }));
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects/{id}/members/invite', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      // restoring the stubs in beforeEach instead of afterEach because these methods are already stubbed
      server.services.pubsub.init.restore();
      server.services.pubsub.publish.restore();
      sinon.stub(server.services.pubsub, 'init', () => {});
      sinon.stub(server.services.pubsub, 'publish', () => {});
      // by default mock lookupUserEmails return nothing so all the cases are not broken
      sandbox.stub(util, 'getUserRoles', () => Promise.resolve([]));
      sandbox.stub(util, 'lookupUserEmails', () => Promise.resolve([]));
      sandbox.stub(util, 'getMemberDetailsByUserIds', () => Promise.resolve([{
        userId: 40051333,
        firstName: 'Admin',
        lastName: 'User',
      }]));
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should return 201 if userIds and emails are presented the same time',
        (done) => {
          request(server)
        .post(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({
          userIds: [40051332],
          emails: ['hello@world.com'],
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.success[0];
            should.exist(resJson);
            resJson.role.should.equal('customer');
            resJson.projectId.should.equal(project1.id);
            resJson.email.should.equal('hello@world.com');
            server.services.pubsub.publish.calledWith('project.member.invite.created').should.be.true;
            done();
          }
        });
        });

    it('should return 400 if neither userIds or email is presented',
        (done) => {
          request(server)
        .post(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(400)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const errorMessage = _.get(res.body, 'message', '');
            sinon.assert.match(errorMessage, /.*Either userIds or emails are required/);
            done();
          }
        });
        });

    it('should return 403 if try to create copilot without MANAGER_ROLES', (done) => {
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
        .post(`/v5/projects/${project2.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          userIds: [40152855],
          role: 'copilot',
        })
        .expect('Content-Type', /json/)
        .expect(403)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const errorMessage = _.get(res.body, 'message', '');
            sinon.assert.match(errorMessage, /.*You are not allowed to invite user as/);
            done();
          }
        });
    });

    it('should return 403 if try to create copilot with MEMBER', (done) => {
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
        .post(`/v5/projects/${project2.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          userIds: [40152855],
          role: 'copilot',
        })
        .expect('Content-Type', /json/)
        .expect(403)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const errorMessage = _.get(res.body, 'message', '');
            sinon.assert.match(errorMessage, /.*You are not allowed to invite user as/);
            done();
          }
        });
    });

    it('should return 201 and add new email invite as customer', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                success: [{
                  roleName: USER_ROLE.COPILOT,
                }],
              },
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post(`/v5/projects/${project2.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          emails: ['hello@world.com'],
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.success[0];
            should.exist(resJson);
            resJson.role.should.equal('customer');
            resJson.projectId.should.equal(project2.id);
            resJson.email.should.equal('hello@world.com');
            server.services.pubsub.publish.calledWith('project.member.invite.created').should.be.true;
            done();
          }
        });
    });

    it('should return 201 and add new userId invite as customer for existent user when invite by email', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                success: [{
                  roleName: USER_ROLE.COPILOT,
                }],
              },
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      util.lookupUserEmails.restore();
      sandbox.stub(util, 'lookupUserEmails', () => Promise.resolve([{
        id: '12345',
        email: 'hello@world.com',
      }]));
      request(server)
        .post(`/v5/projects/${project2.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          emails: ['hello@world.com'],
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.success[0];
            should.exist(resJson);
            resJson.role.should.equal('customer');
            resJson.projectId.should.equal(project2.id);
            resJson.userId.should.equal(12345);
            resJson.email.should.equal('hello@world.com');
            server.services.pubsub.publish.calledWith('project.member.invite.created').should.be.true;
            done();
          }
        });
    });

    it('should return 201 and add new user invite as customer', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                success: [{
                  roleName: USER_ROLE.COPILOT,
                }],
              },
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post(`/v5/projects/${project2.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          userIds: [40152855],
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.success[0];
            should.exist(resJson);
            resJson.role.should.equal('customer');
            resJson.projectId.should.equal(project2.id);
            resJson.userId.should.equal(40152855);
            server.services.pubsub.publish.calledWith('project.member.invite.created').should.be.true;
            done();
          }
        });
    });

    it('should return 201 and empty response when trying add already invited member', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                success: [{
                  roleName: USER_ROLE.COPILOT,
                }],
              },
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          userIds: [40051335],
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.success;
            should.exist(resJson);
            resJson.length.should.equal(0);
            server.services.pubsub.publish.neverCalledWith('project.member.invite.created').should.be.true;
            done();
          }
        });
    });

    it('should return 403 if try to create manager without MANAGER_ROLES', (done) => {
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
        .post(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          userIds: [40152855],
          role: 'manager',
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
            sinon.assert.match(errorMessage, /.*not allowed to invite user as/);
            done();
          }
        });
    });

    it('should return 201 if try to create manager with MANAGER_ROLES', (done) => {
      util.getUserRoles.restore();
      sandbox.stub(util, 'getUserRoles', () => Promise.resolve([USER_ROLE.MANAGER]));
      request(server)
        .post(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          userIds: [40152855],
          role: 'manager',
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.success[0];
          should.exist(resJson);
          resJson.role.should.equal('manager');
          resJson.projectId.should.equal(project1.id);
          resJson.userId.should.equal(40152855);
          server.services.pubsub.publish.calledWith('project.member.invite.created').should.be.true;
          done();
        });
    });

    it('should return 201 if try to create account_manager with MANAGER_ROLES', (done) => {
      util.getUserRoles.restore();
      sandbox.stub(util, 'getUserRoles', () => Promise.resolve([USER_ROLE.MANAGER]));
      request(server)
        .post(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          userIds: [40152855],
          role: 'account_manager',
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.success[0];
          should.exist(resJson);
          resJson.role.should.equal('account_manager');
          resJson.projectId.should.equal(project1.id);
          resJson.userId.should.equal(40152855);
          server.services.pubsub.publish.calledWith('project.member.invite.created').should.be.true;
          done();
        });
    });

    it('should return 403 if try to create account_manager with CUSTOMER_ROLE', (done) => {
      util.getUserRoles.restore();
      sandbox.stub(util, 'getUserRoles', () => Promise.resolve(['Topcoder User']));
      request(server)
        .post(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          userIds: [40152855],
          role: 'account_manager',
        })
        .expect('Content-Type', /json/)
        .expect(403)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.failed[0];
            should.exist(resJson);
            const errorMessage = _.get(resJson, 'message', '');
            sinon.assert.match(errorMessage, /.*cannot be added with a Manager role to the project/);
            done();
          }
        });
    });

    it('should return 201 if try to create customer with COPILOT', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                success: [{
                  roleName: USER_ROLE.COPILOT,
                }],
              },
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          userIds: [40051331],
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
            resJson.userId.should.equal(40051331);
            server.services.pubsub.publish.calledWith('project.member.invite.created').should.be.true;
            done();
          }
        });
    });

    it('should return 201 and empty response when trying add already invited member by lowercase email', (done) => {
      request(server)
        .post(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          emails: ['DUPLICATE_LOWERCASE@test.com'],
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.success;
            should.exist(resJson);
            resJson.length.should.equal(0);
            done();
          }
        });
    });

    it('should return 201 and empty response when trying add already invited member by uppercase email', (done) => {
      request(server)
        .post(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          emails: ['duplicate_uppercase@test.com'],
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.success;
            should.exist(resJson);
            resJson.length.should.equal(0);
            done();
          }
        });
    });

    xit('should return 201 and empty response when trying add already invited member by gmail email with dot',
      (done) => {
        request(server)
          .post(`/v5/projects/${project1.id}/members/invite`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({
            emails: ['WITHdot@gmail.com'],
            role: 'customer',
          })
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body.success;
              should.exist(resJson);
              resJson.length.should.equal(0);
              done();
            }
          });
      });

    xit('should return 201 and empty response when trying add already invited member by gmail email without dot',
      (done) => {
        request(server)
          .post(`/v5/projects/${project1.id}/members/invite`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({
            emails: ['WITHOUT.dot@gmail.com'],
            role: 'customer',
          })
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body.success;
              should.exist(resJson);
              resJson.length.should.equal(0);
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

      it('sends BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED message when userId invite added', (done) => {
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
        .post(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          userIds: [3],
          role: PROJECT_MEMBER_ROLE.CUSTOMER,
        })
        .expect(201)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.calledOnce.should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED).should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED,
                sinon.match({ resource: RESOURCES.PROJECT_MEMBER_INVITE })).should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED,
                sinon.match({ projectId: project1.id })).should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED,
                sinon.match({ userId: 3 })).should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED,
                  sinon.match({ email: null })).should.be.true;
              done();
            });
          }
        });
      });

      it('sends BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED message when email invite added', (done) => {
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
        .post(`/v5/projects/${project1.id}/members/invite`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          emails: ['hello@world.com'],
          role: PROJECT_MEMBER_ROLE.CUSTOMER,
        })
        .expect(201)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.calledOnce.should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED).should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED,
                sinon.match({ resource: RESOURCES.PROJECT_MEMBER_INVITE })).should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED,
                sinon.match({ projectId: project1.id })).should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED,
                sinon.match({ userId: null })).should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED,
                  sinon.match({ email: 'hello@world.com' })).should.be.true;
              done();
            });
          }
        });
      });
    });
  });
});
