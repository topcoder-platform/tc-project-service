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
  PROJECT_MEMBER_ROLE,
  INVITE_STATUS,
} from '../../constants';

const should = chai.should();

describe('Project member invite delete', () => {
  let project1;
  let project2;

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => {
        const p1 = models.Project.create({
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
          const pm1 = models.ProjectMember.create({
            userId: testUtil.userIds.manager,
            projectId: project1.id,
            role: 'manager',
            isPrimary: false,
            createdBy: 1,
            updatedBy: 1,
            createdAt: '2016-06-30 00:33:07+00',
            updatedAt: '2016-06-30 00:33:07+00',
          });

          const invite1 = models.ProjectMemberInvite.create({
            id: 1,
            projectId: project1.id,
            userId: testUtil.userIds.member,
            email: null,
            role: PROJECT_MEMBER_ROLE.CUSTOMER,
            status: INVITE_STATUS.PENDING,
            createdBy: 1,
            updatedBy: 1,
            createdAt: '2016-06-30 00:33:07+00',
            updatedAt: '2016-06-30 00:33:07+00',
          });

          const invite2 = models.ProjectMemberInvite.create({
            id: 2,
            projectId: project1.id,
            userId: testUtil.userIds.copilot,
            email: null,
            role: PROJECT_MEMBER_ROLE.COPILOT,
            status: INVITE_STATUS.REQUESTED,
            createdBy: 1,
            updatedBy: 1,
            createdAt: '2016-06-30 00:33:07+00',
            updatedAt: '2016-06-30 00:33:07+00',
          });

          const invite3 = models.ProjectMemberInvite.create({
            id: 3,
            projectId: project1.id,
            userId: testUtil.userIds.manager,
            email: null,
            role: PROJECT_MEMBER_ROLE.MANAGER,
            status: INVITE_STATUS.PENDING,
            createdBy: 1,
            updatedBy: 1,
            createdAt: '2016-06-30 00:33:07+00',
            updatedAt: '2016-06-30 00:33:07+00',
          });

          return Promise.all([pm1, invite1, invite2, invite3]);
        });

        const p2 = models.Project.create({
          type: 'generic',
          directProjectId: 1,
          billingAccountId: 1,
          name: 'test2',
          description: 'test project2',
          status: 'draft',
          details: {},
          createdBy: 1,
          updatedBy: 1,
          lastActivityAt: 1,
          lastActivityUserId: '1',
        }).then((p) => {
          project2 = p;
          // create members
          const pm = models.ProjectMember.create({
            userId: testUtil.userIds.manager,
            projectId: project2.id,
            role: 'manager',
            isPrimary: false,
            createdBy: 1,
            updatedBy: 1,
            createdAt: '2016-06-30 00:33:07+00',
            updatedAt: '2016-06-30 00:33:07+00',
          });

          const invite4 = models.ProjectMemberInvite.create({
            id: 4,
            projectId: project2.id,
            userId: testUtil.userIds.member,
            email: null,
            role: PROJECT_MEMBER_ROLE.CUSTOMER,
            status: INVITE_STATUS.PENDING,
            createdBy: 1,
            updatedBy: 1,
            createdAt: '2016-06-30 00:33:07+00',
            updatedAt: '2016-06-30 00:33:07+00',
          });

          const invite5 = models.ProjectMemberInvite.create({
            id: 5,
            projectId: project2.id,
            userId: null,
            email: 'romit.choudhary@rivigo.com',
            role: PROJECT_MEMBER_ROLE.CUSTOMER,
            status: INVITE_STATUS.PENDING,
            createdBy: 1,
            updatedBy: 1,
            createdAt: '2016-06-30 00:33:07+00',
            updatedAt: '2016-06-30 00:33:07+00',
          });

          const invite6 = models.ProjectMemberInvite.create({
            id: 6,
            projectId: project2.id,
            userId: testUtil.userIds.copilot,
            email: null,
            role: PROJECT_MEMBER_ROLE.COPILOT,
            status: INVITE_STATUS.ACCEPTED,
            createdBy: 1,
            updatedBy: 1,
            createdAt: '2016-06-30 00:33:07+00',
            updatedAt: '2016-06-30 00:33:07+00',
          });

          const invite7 = models.ProjectMemberInvite.create({
            id: 7,
            projectId: project2.id,
            userId: testUtil.userIds.copilot,
            email: null,
            role: PROJECT_MEMBER_ROLE.COPILOT,
            status: INVITE_STATUS.ACCEPTED,
            createdBy: 1,
            updatedBy: 1,
            createdAt: '2016-06-30 00:33:07+00',
            updatedAt: '2016-06-30 00:33:07+00',
          });

          return Promise.all([pm, invite4, invite5, invite6, invite7]);
        });

        Promise.all([p1, p2]).then(() => done());
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('DELETE /projects/{id}/invites', () => {
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
        .delete(`/v5/projects/${project1.id}/invites/1`)
        .send(body)
        .expect(403, done);
    });

    it('should return 404 if invitation id and project id doesn\'t match', (done) => {
      request(server)
        .delete(`/v5/projects/${project1.id}/invites/5`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(404)
        .end(() => {
          done();
        });
    });

    it('should return 404 if project id doesn\'t exist', (done) => {
      request(server)
        .delete('/v5/projects/99999/invites/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(404)
        .end(() => {
          done();
        });
    });

    it('should return 404 if invitation id doesn\'t exist', (done) => {
      request(server)
        .delete(`/v5/projects/${project1.id}/invites/99999`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(404)
        .end(() => {
          done();
        });
    });

    it('should return 404 if invitation status is not pending or requested', (done) => {
      request(server)
        .delete(`/v5/projects/${project2.id}/invites/6`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(404)
        .end(() => {
          done();
        });
    });

    it('should return 403 if try to cancel MANAGER role invite with copilot', (done) => {
      request(server)
        .delete(`/v5/projects/${project1.id}/invites/3`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
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
            sinon.assert.match(errorMessage,
              'You don\'t have permissions to cancel invites to Topcoder Team for other users.');
            done();
          }
        });
    });

    it('should return 403 if try to cancel others Topcoder Team invite with CUSTOMER', (done) => {
      request(server)
        .delete(`/v5/projects/${project1.id}/invites/3`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
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
            sinon.assert.match(errorMessage,
              'You don\'t have permissions to cancel invites to Topcoder Team for other users.');
            done();
          }
        });
    });

    it('should return 403 if try to cancel COPILOT role invite with copilot', (done) => {
      request(server)
        .delete(`/v5/projects/${project1.id}/invites/2`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
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
            sinon.assert.match(errorMessage, 'You don\'t have permissions to cancel requested invites.');
            done();
          }
        });
    });

    it('should return 204 if member cancels his/her invitation', (done) => {
      request(server)
        .delete(`/v5/projects/${project1.id}/invites/1`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(204)
        .end(() => done());
    });

    it('should return 204 if admin cancels his/her invitation', (done) => {
      request(server)
        .delete(`/v5/projects/${project2.id}/invites/4`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end(() => done());
    });

    it('should return 204 if copilot cancels his/her invitation', (done) => {
      request(server)
        .delete(`/v5/projects/${project1.id}/invites/2`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(204)
        .end(() => done());
    });

    it('should return 204 if "Connect Copilot Manager" cancels invitation for copilot', (done) => {
      request(server)
        .delete(`/v5/projects/${project1.id}/invites/7`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilotManager}`,
        })
        .expect(204)
        .end(() => done());
    });

    it('should return 204 if user cancels invitation', (done) => {
      request(server)
        .delete(`/v5/projects/${project1.id}/invites/5`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.romit}`,
        })
        .expect(204)
        .end(() => done());
    });

    it('should return 204 if cancel invitation using M2M token with "write:project-members" scope', (done) => {
      request(server)
        .delete(`/v5/projects/${project1.id}/invites/6`)
        .set({
          Authorization: `Bearer ${testUtil.m2m['write:project-members']}`,
        })
        .expect(204)
        .end(() => done());
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
          .delete(`/v5/projects/${project1.id}/invites/3`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
          })
          .expect(204)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(1);

                // Events for accepted invite
                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_INVITE_REMOVED, sinon.match({
                  resource: RESOURCES.PROJECT_MEMBER_INVITE,
                  projectId: project1.id,
                  id: 3,
                })).should.be.true;

                done();
              });
            }
          });
      });
    });
  });
});
