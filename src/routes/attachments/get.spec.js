/* eslint-disable no-unused-expressions */
import sinon from 'sinon';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import util from '../../util';
import { ATTACHMENT_TYPES } from '../../constants';

describe('Get Project attachments Tests', () => {
  let project1;
  let attachment;
  let getFileDownloadUrlStub;

  before(() => {
    getFileDownloadUrlStub = sinon.stub(util, 'getFileDownloadUrl');
    getFileDownloadUrlStub.returns('dummy://url');
  });

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => testUtil.clearES())
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
          return models.ProjectMember.create({
            userId: 40051332,
            projectId: project1.id,
            role: 'copilot',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          }).then(() => models.ProjectMember.create({
            userId: testUtil.userIds.member,
            projectId: project1.id,
            role: 'customer',
            isPrimary: false,
            createdBy: 1,
            updatedBy: 1,
          })).then(() => models.ProjectMember.create({
            userId: testUtil.userIds.member2,
            projectId: project1.id,
            role: 'customer',
            isPrimary: false,
            createdBy: 1,
            updatedBy: 1,
          })).then(() => models.ProjectAttachment.create({
            projectId: project1.id,
            title: 'test.txt',
            description: 'blah',
            contentType: 'application/unknown',
            size: 12312,
            category: null,
            path: 'https://media.topcoder.com/projects/1/test.txt',
            type: ATTACHMENT_TYPES.FILE,
            tags: ['tag1', 'tag2'],
            createdBy: testUtil.userIds.copilot,
            updatedBy: 1,
            allowedUsers: [testUtil.userIds.member],
          }).then((a1) => {
            attachment = a1;
            done();
          }));
        });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('Download /projects/{id}/attachments/{id}', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should return 404 if USER does not have permissions', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send()
        .expect(404, done);
    });

    it('should return 404 if MANAGER does not have permissions', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send()
        .expect(404, done);
    });

    it('should return 404 if attachment was not found', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/attachments/8888888`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send()
        .expect(404, done);
    });

    it('should return 200 when the CREATOR can download attachment successfully', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send()
        .expect(200, done);
    });

    it('should return 200 when the USER with permission can download attachment successfully', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send()
        .expect(200, done);
    });

    it('should return 200 when ADMIN can download attachment successfully', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send()
        .expect(200, done);
    });

    it('should return 200 when using M2M token with scope "read:projects"', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
        .set({
          Authorization: `Bearer ${testUtil.m2m['read:projects']}`,
        })
        .send()
        .expect(200, done);
    });
  });
});
