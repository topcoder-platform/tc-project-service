/**
 * Tests for list.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('GET project member', () => {
  let projectId;
  let memberId;
  let memberId2;

  const memberUser = {
    handle: testUtil.getDecodedToken(testUtil.jwts.member).handle,
    userId: testUtil.getDecodedToken(testUtil.jwts.member).userId,
    firstName: 'fname',
    lastName: 'lName',
    email: 'some@abc.com',
  };
  const copilotUser = {
    handle: testUtil.getDecodedToken(testUtil.jwts.copilot).handle,
    userId: testUtil.getDecodedToken(testUtil.jwts.copilot).userId,
    firstName: 'fname',
    lastName: 'lName',
    email: 'some@abc.com',
  };

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => testUtil.clearES())
      .then(() => {
        // Create projects
        models.Project.create({
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
        })
          .then((project) => {
            projectId = project.id;
            // create members
            models.ProjectMember.create({
              id: 1,
              userId: copilotUser.userId,
              projectId,
              role: 'copilot',
              isPrimary: false,
              createdBy: 1,
              updatedBy: 1,
            }).then((_member) => {
              memberId = _member.id;
              models.ProjectMember.create({
                id: 2,
                userId: memberUser.userId,
                projectId,
                role: 'customer',
                isPrimary: true,
                createdBy: 1,
                updatedBy: 1,
              }).then((m) => {
                memberId2 = m.id;
                done();
              });
            });
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/{projectId}/members/{memberId}', () => {
    it('should return 403 for anonymous user', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/members/${memberId}`)
        .expect(403, done);
    });

    it('should return 404 if requested project doesn\'t exist', (done) => {
      request(server)
        .get('/v5/projects/9999999/members/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 if requested project member doesn\'t exist', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/members/9999`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/members/${memberId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/members/${memberId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/members/${memberId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/members/${memberId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });

    it('should return 200 for admin when retrieve member with id=1', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/members/${memberId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.userId.should.be.eql(_.parseInt(copilotUser.userId));
          resJson.role.should.be.eql('copilot');
          resJson.projectId.should.be.eql(projectId);
          should.exist(resJson.createdAt);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return member using using M2M token with "read:project-members" scope', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/members/${memberId}`)
        .set({
          Authorization: `Bearer ${testUtil.m2m['read:project-members']}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.userId.should.be.eql(_.parseInt(copilotUser.userId));
          resJson.role.should.be.eql('copilot');
          resJson.projectId.should.be.eql(projectId);
          should.exist(resJson.createdAt);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin when retrieve member with id=2', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/members/${memberId2}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.userId.should.be.eql(_.parseInt(memberUser.userId));
          resJson.role.should.be.eql('customer');
          resJson.projectId.should.be.eql(projectId);
          should.exist(resJson.createdAt);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });
  });
});
