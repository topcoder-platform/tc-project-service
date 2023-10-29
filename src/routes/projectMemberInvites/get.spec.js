/* eslint-disable no-unused-expressions */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import { INVITE_STATUS } from '../../constants';

const should = chai.should();

describe('GET Project Member Invite', () => {
  let project1;
  let project2;
  before((done) => {
    // clear ES and db
    testUtil.clearES().then(() => {
      testUtil.clearDb()
        .then(() => {
          const p1 = models.Project.create({
            type: 'generic',
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
              userId: testUtil.userIds.admin,
              projectId: project1.id,
              role: 'copilot',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1,
            });
            // create invite
            const invite1 = models.ProjectMemberInvite.create({
              id: 1,
              userId: testUtil.userIds.member,
              email: null,
              projectId: project1.id,
              role: 'customer',
              createdBy: 1,
              updatedBy: 1,
              status: INVITE_STATUS.PENDING,
            });

            const invite2 = models.ProjectMemberInvite.create({
              id: 2,
              userId: testUtil.userIds.copilot,
              email: 'test@topcoder.com',
              projectId: project1.id,
              role: 'copilot',
              createdBy: 1,
              updatedBy: 1,
              status: INVITE_STATUS.PENDING,
            });

            return Promise.all([pm1, invite1, invite2]);
          });

          const p2 = models.Project.create({
            type: 'visual_design',
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

            // create invite 3
            const invite3 = models.ProjectMemberInvite.create({
              id: 3,
              userId: null,
              email: 'test@topcoder.com',
              projectId: project2.id,
              role: 'customer',
              createdBy: 1,
              updatedBy: 1,
              status: INVITE_STATUS.PENDING,
            });

            const invite4 = models.ProjectMemberInvite.create({
              id: 4,
              userId: testUtil.userIds.member2,
              email: null,
              projectId: project2.id,
              role: 'customer',
              createdBy: 1,
              updatedBy: 1,
              status: INVITE_STATUS.ACCEPTED,
            });

            return Promise.all([invite3, invite4]);
          });
          return Promise.all([p1, p2])
            .then(() => done());
        });
    });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/{projectId}/invites/{inviteId}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get(`/v5/projects/${project2.id}/invites/1`)
        .expect(403, done);
    });

    it('should return 404 if requested project doesn\'t exist', (done) => {
      request(server)
        .get('/v5/projects/14343323/invites/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 if requested invitation doesn\'t exist', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/invites/12345678`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 if requested invitation and project doesn\'t match', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/invites/3`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 if user can\'t view project and this invitation is not for this user', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/invites/1`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(404, done);
    });

    it('should return 404 if invitation is not in pending or requested status', (done) => {
      request(server)
        .get(`/v5/projects/${project2.id}/invites/4`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return the invite if user can view the project', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/invites/1`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            should.exist(resJson.projectId);
            resJson.id.should.be.eql(1);
            resJson.userId.should.be.eql(testUtil.userIds.member);
            resJson.status.should.be.eql(INVITE_STATUS.PENDING);
            done();
          }
        });
    });

    it('should return the invite using M2M token with "read:project-invites" scope', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/invites/1`)
        .set({
          Authorization: `Bearer ${testUtil.m2m['read:project-invites']}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            should.exist(resJson.projectId);
            resJson.id.should.be.eql(1);
            resJson.userId.should.be.eql(testUtil.userIds.member);
            resJson.status.should.be.eql(INVITE_STATUS.PENDING);
            done();
          }
        });
    });

    it('should return the invite if this invitation is for logged-in user', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/invites/2`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            should.exist(resJson.projectId);
            resJson.id.should.be.eql(2);
            resJson.status.should.be.eql(INVITE_STATUS.PENDING);
            done();
          }
        });
    });

    it('should return the invite if user get invitation by email', (done) => {
      request(server)
        .get(`/v5/projects/${project2.id}/invites/3`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            should.exist(resJson.projectId);
            resJson.id.should.be.eql(3);
            // not masked, because user who is invited by email is the user who is calling this endpoint
            resJson.email.should.be.eql('test@topcoder.com');
            resJson.status.should.be.eql(INVITE_STATUS.PENDING);
            done();
          }
        });
    });
  });
});
