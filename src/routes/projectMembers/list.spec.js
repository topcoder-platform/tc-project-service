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

describe('LIST project members', () => {
  let id;

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
            id = project.id;
            // create members
            models.ProjectMember.create({
              id: 1,
              userId: copilotUser.userId,
              projectId: id,
              role: 'copilot',
              isPrimary: false,
              createdBy: 1,
              updatedBy: 1,
            }).then(() => {
              models.ProjectMember.create({
                id: 2,
                userId: memberUser.userId,
                projectId: id,
                role: 'customer',
                isPrimary: true,
                createdBy: 1,
                updatedBy: 1,
              }).then(() => done());
            });
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/{id}/members', () => {
    it('should return 403 for anonymous user', (done) => {
      request(server)
        .get(`/v5/projects/${id}/members`)
        .expect(403, done);
    });

    it('should return 400 for invalid role', (done) => {
      request(server)
        .get(`/v5/projects/${id}/members?role=invalid`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(400, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get(`/v5/projects/${id}/members`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get(`/v5/projects/${id}/members`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get(`/v5/projects/${id}/members`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get(`/v5/projects/${id}/members`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get(`/v5/projects/${id}/members`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(2);
          resJson[0].userId.should.be.eql(copilotUser.userId);
          resJson[0].role.should.be.eql('copilot');
          resJson[0].projectId.should.be.eql(id);
          should.exist(resJson[0].createdAt);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);

          done();
        });
    });

    it('should return member using using M2M token with "read:project-members" scope', (done) => {
      request(server)
        .get(`/v5/projects/${id}/members`)
        .set({
          Authorization: `Bearer ${testUtil.m2m['read:project-members']}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(2);
          resJson[0].userId.should.be.eql(copilotUser.userId);
          resJson[0].role.should.be.eql('copilot');
          resJson[0].projectId.should.be.eql(id);
          should.exist(resJson[0].createdAt);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);

          done();
        });
    });

    it('should return 200 for admin with filter', (done) => {
      request(server)
        .get(`/v5/projects/${id}/members?role=customer`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(1);
          resJson[0].userId.should.be.eql(_.parseInt(memberUser.userId));
          resJson[0].role.should.be.eql('customer');
          resJson[0].projectId.should.be.eql(id);
          should.exist(resJson[0].createdAt);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);

          done();
        });
    });
  });
});
