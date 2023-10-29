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
import {
  USER_ROLE,
  PROJECT_MEMBER_ROLE,
  INVITE_STATUS,
  BUS_API_EVENT,
  RESOURCES,
  CONNECT_NOTIFICATION_EVENT,
} from '../../constants';

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

          models.ProjectMember.create({
            userId: 40158431,
            projectId: project1.id,
            role: 'customer',
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

  describe('POST /projects/{id}/invites', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      // by default mock lookupMultipleUserEmails return nothing so all the cases are not broken
      sandbox.stub(util, 'getUserRoles', () => Promise.resolve([]));
      sandbox.stub(util, 'lookupMultipleUserEmails', () => Promise.resolve([]));
      sandbox.stub(util, 'getMemberDetailsByUserIds', () => Promise.resolve([{
        userId: 40051333,
        firstName: 'Admin',
        lastName: 'User',
      }]));
      // mock getMemberDetailsByHandles function.
      sandbox.stub(util, 'getMemberDetailsByHandles', (handles) => {
        if (_.isNil(handles) || _.isEmpty(handles)) {
          return Promise.resolve([]);
        }
        let userHandles = [{
          userId: 40011578,
          handle: 'magrathean',
        }, {
          userId: 40011579,
          handle: 'test_user1',
        }, {
          userId: 40011578,
          handle: 'test_user2',
        }, {
          userId: 40051331,
          handle: 'test_customer1',
        }, {
          userId: 40051332,
          handle: 'test_copilot1',
        }, {
          userId: 40051333,
          handle: 'test_manager1',
        }, {
          userId: 40051334,
          handle: 'test_manager2',
        }, {
          userId: 40051335,
          handle: 'test_manager3',
        }, {
          userId: 40051336,
          handle: 'test_manager4',
        }, {
          userId: 40135978,
          handle: 'test_admin1',
        }];
        userHandles = _.each(userHandles, u => _.extend(u, { firstName: 'Connect', lastName: 'User' }));

        return Promise.resolve(_.filter(userHandles, u => handles.indexOf(u.handle) >= 0));
      });
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should return 201 if userIds and emails are presented the same time',
      (done) => {
        request(server)
          .post(`/v5/projects/${project1.id}/invites`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            handles: ['test_customer1'],
            emails: ['hello@world.com'],
            role: 'customer',
          })
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body.success[1];
              should.exist(resJson);
              resJson.role.should.equal('customer');
              resJson.projectId.should.equal(project1.id);
              resJson.email.should.equal('hello@world.com');
              done();
            }
          });
      });

    it('should return 400 if neither handles or email is presented',
      (done) => {
        request(server)
          .post(`/v5/projects/${project1.id}/invites`)
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
              sinon.assert.match(errorMessage, /.*Either handles or emails are required/);
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
        .post(`/v5/projects/${project2.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          handles: ['test_user1'],
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
        .post(`/v5/projects/${project2.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          handles: ['test_user1'],
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
        .post(`/v5/projects/${project2.id}/invites`)
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
      util.lookupMultipleUserEmails.restore();
      sandbox.stub(util, 'lookupMultipleUserEmails', () => Promise.resolve([{
        id: '12345',
        email: 'hello@world.com',
      }]));
      request(server)
        .post(`/v5/projects/${project2.id}/invites`)
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
            should.not.exist(resJson.userId);
            resJson.email.should.equal('hello@world.com');
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
                  userId: 40152855,
                  roleName: USER_ROLE.COPILOT,
                }],
              },
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post(`/v5/projects/${project2.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          handles: ['test_customer1'],
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
            resJson.userId.should.equal(40051331);
            should.not.exist(resJson.email);
            done();
          }
        });
    });

    it('should return 403 and failed list when trying add already team member by handle', (done) => {
      request(server)
        .post(`/v5/projects/${project1.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          handles: ['test_copilot1'],
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(403)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.failed;
            should.exist(resJson);
            resJson[0].handle.should.equal('test_copilot1');
            resJson[0].message.should.equal('User with such handle is already a member of the team.');
            resJson.length.should.equal(1);
            done();
          }
        });
    });

    it('should return 403 and failed list when trying add already team member by email', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: () => Promise.resolve({
          status: 200,
          data: {
            success: [{
              userId: 40158431,
              roleName: USER_ROLE.COPILOT,
            }],
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      util.lookupMultipleUserEmails.restore();
      sandbox.stub(util, 'lookupMultipleUserEmails', () => Promise.resolve([{
        id: '40158431',
        email: 'romit.choudhary@rivigo.com',
      }]));
      request(server)
        .post(`/v5/projects/${project1.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          emails: ['romit.choudhary@rivigo.com'],
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(403)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.failed;
            should.exist(resJson);
            resJson[0].email.should.equal('romit.choudhary@rivigo.com');
            resJson[0].message.should.equal('User with such email is already a member of the team.');
            resJson.length.should.equal(1);
            done();
          }
        });
    });

    it('should return 403 and failed list when trying add already invited member by handle', (done) => {
      request(server)
        .post(`/v5/projects/${project1.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          handles: ['test_manager3'],
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(403)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.failed;
            should.exist(resJson);
            resJson.length.should.equal(1);
            resJson[0].handle.should.equal('test_manager3');
            resJson[0].message.should.equal('User with such handle is already invited to this project.');
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
        .post(`/v5/projects/${project1.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          handles: ['test_user'],
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

    it('should return 201 if try to create invitation with non-existent handle', (done) => {
      util.getUserRoles.restore();
      sandbox.stub(util, 'getUserRoles', () => Promise.resolve([USER_ROLE.MANAGER]));
      request(server)
        .post(`/v5/projects/${project1.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          handles: ['invalid_handle'],
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(403)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.failed[0];
            should.exist(resJson);
            resJson.handle.should.equal('invalid_handle');
            resJson.message.should.equal('User with such handle does not exist');
            done();
          }
        });
    });

    it('should return 201 if try to create manager with MANAGER_ROLES', (done) => {
      util.getUserRoles.restore();
      sandbox.stub(util, 'getUserRoles', () => Promise.resolve([USER_ROLE.MANAGER]));
      request(server)
        .post(`/v5/projects/${project1.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          handles: ['test_manager4'],
          role: 'manager',
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.success[0];
          should.exist(resJson);
          resJson.role.should.equal('manager');
          resJson.projectId.should.equal(project1.id);
          resJson.userId.should.equal(40051336);
          done();
        });
    });

    it('should invite a user as "manager" using M2M token with "write:project-invites" scope', (done) => {
      util.getUserRoles.restore();
      sandbox.stub(util, 'getUserRoles', () => Promise.resolve([USER_ROLE.MANAGER]));
      request(server)
        .post(`/v5/projects/${project1.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.m2m['write:project-invites']}`,
        })
        .send({
          handles: ['test_manager1'],
          role: 'manager',
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.success[0];
          should.exist(resJson);
          resJson.role.should.equal('manager');
          resJson.projectId.should.equal(project1.id);
          resJson.userId.should.equal(40051333);
          done();
        });
    });

    it('should return 403 if try to create account_manager with CUSTOMER_ROLE', (done) => {
      util.getUserRoles.restore();
      sandbox.stub(util, 'getUserRoles', () => Promise.resolve(['Topcoder User']));
      request(server)
        .post(`/v5/projects/${project1.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          handles: ['test_customer1'],
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
            sinon.assert.match(errorMessage, /.*cannot be invited with a "account_manager" role to the project/);
            done();
          }
        });
    });

    it('should return 201 if try to create copilot invite with COPILOT role', (done) => {
      util.getUserRoles.restore();
      sandbox.stub(util, 'getUserRoles', () => Promise.resolve(['Connect Copilot']));
      request(server)
        .post(`/v5/projects/${project1.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          handles: ['test_customer1'],
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
            done();
          }
        });
    });

    it('should return 201 if try to create copilot invite by "Connect Copilot Manager"', (done) => {
      util.getUserRoles.restore();
      sandbox.stub(util, 'getUserRoles', () => Promise.resolve([USER_ROLE.COPILOT]));
      request(server)
        .post(`/v5/projects/${project2.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilotManager}`,
        })
        .send({
          handles: ['test_customer1'],
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
            resJson.projectId.should.equal(project2.id);
            resJson.userId.should.equal(40051331);
            done();
          }
        });
    });

    it('should return 403 and failed list when trying add already invited member by lowercase email', (done) => {
      request(server)
        .post(`/v5/projects/${project1.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          emails: ['DUPLICATE_LOWERCASE@test.com'],
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(403)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.failed;
            should.exist(resJson);
            resJson[0].email.should.equal('duplicate_lowercase@test.com');
            resJson[0].message.should.equal('User with such email is already invited to this project.');
            resJson.length.should.equal(1);
            done();
          }
        });
    });

    it('should return 403 and failed list when trying add already invited member by uppercase email', (done) => {
      request(server)
        .post(`/v5/projects/${project1.id}/invites`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          emails: ['duplicate_uppercase@test.com'],
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(403)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.failed;
            should.exist(resJson);
            resJson[0].email.should.equal('DUPLICATE_UPPERCASE@test.com');
            resJson[0].message.should.equal('User with such email is already invited to this project.');
            resJson.length.should.equal(1);
            done();
          }
        });
    });

    xit('should return 403 and failed list when trying add already invited member by gmail email with dot',
      (done) => {
        request(server)
          .post(`/v5/projects/${project1.id}/invites`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({
            emails: ['WITHdot@gmail.com'],
            role: 'customer',
          })
          .expect('Content-Type', /json/)
          .expect(403)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body.failed;
              should.exist(resJson);
              resJson[0].email.should.equal('WITHdot@gmail.com');
              resJson.length.should.equal(1);
              done();
            }
          });
      });

    xit('should return 403 and failed list when trying add already invited member by gmail email without dot',
      (done) => {
        request(server)
          .post(`/v5/projects/${project1.id}/invites`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({
            emails: ['WITHOUT.dot@gmail.com'],
            role: 'customer',
          })
          .expect('Content-Type', /json/)
          .expect(403)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body.failed;
              should.exist(resJson);
              resJson.length.should.equal(1);
              resJson[0].email.should.equal('WITHOUT.dot@gmail.com');
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

      it('should send correct BUS API messages when invite added by handle', (done) => {
        request(server)
          .post(`/v5/projects/${project1.id}/invites`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.manager}`,
          })
          .send({
            handles: ['test_user2'],
            role: PROJECT_MEMBER_ROLE.CUSTOMER,
          })
          .expect(201)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(2);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED, sinon.match({
                  resource: RESOURCES.PROJECT_MEMBER_INVITE,
                  projectId: project1.id,
                  userId: 40011578,
                  email: null,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_MEMBER_INVITE_CREATED, sinon.match({
                  projectId: project1.id,
                  userId: 40011578,
                  email: null,
                  isSSO: false,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when invite added by email', (done) => {
        const mockHttpClient = _.merge(testUtil.mockHttpClient, {
          get: () => Promise.resolve({
            status: 200,
            data: [{
              roleName: USER_ROLE.MANAGER,
            }],
          }),
        });
        sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
        request(server)
          .post(`/v5/projects/${project1.id}/invites`)
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
                createEventSpy.callCount.should.be.eql(3);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_CREATED, sinon.match({
                  resource: RESOURCES.PROJECT_MEMBER_INVITE,
                  projectId: project1.id,
                  userId: null,
                  email: 'hello@world.com',
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_MEMBER_INVITE_CREATED, sinon.match({
                  projectId: project1.id,
                  userId: null,
                  email: 'hello@world.com',
                  isSSO: false,
                })).should.be.true;
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_MEMBER_EMAIL_INVITE_CREATED, sinon.match({
                  recipients: ['hello@world.com'],
                })).should.be.true;

                done();
              });
            }
          });
      });
    });
  });
});
