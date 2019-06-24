/* eslint-disable no-unused-expressions */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import { INVITE_STATUS } from '../../constants';

const should = chai.should();

describe('GET Project', () => {
  let project1;
  let project2;
  before((done) => {
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
              userId: 40051333,
              projectId: project1.id,
              role: 'copilot',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1,
            });
            // create invite
            const invite1 = models.ProjectMemberInvite.create({
              userId: 40051331,
              email: null,
              projectId: project1.id,
              role: 'customer',
              createdBy: 1,
              updatedBy: 1,
              status: INVITE_STATUS.PENDING,
            });
            return Promise.all([pm1, invite1]);
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
          });
          return Promise.all([p1, p2])
              .then(() => done());
        });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/{id}/members/invite', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
          .get(`/v5/projects/${project2.id}/members/invite`)
          .expect(403, done);
    });

    it('should return 404 if requested project doesn\'t exist', (done) => {
      request(server)
          .get('/v5/projects/14343323/members/invite')
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .expect(404, done);
    });

    it('should return the invite if user is invited to this project', (done) => {
      request(server)
          .get(`/v5/projects/${project1.id}/members/invite`)
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
              resJson.userId.should.be.eql(40051331);
              resJson.status.should.be.eql(INVITE_STATUS.PENDING);
              done();
            }
          });
    });

    it('should return 404 if user is not invited to this project', (done) => {
      request(server)
          .get(`/v5/projects/${project2.id}/members/invite`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.member}`,
          })
          .expect('Content-Type', /json/)
          .expect(404)
          .end(() => {
            done();
          });
    });
  });
});
