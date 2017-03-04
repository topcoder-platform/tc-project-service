/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import sinon from 'sinon';
import request from 'supertest';

import models from '../../models';
import util from '../../util';
import server from '../../app';
import testUtil from '../../tests/util';


describe('Project Attachments delete', () => {
  let project1;
  let attachment;
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
            }).then(() => models.ProjectAttachment.create({
              projectId: project1.id,
              title: 'test.txt',
              description: 'blah',
              contentType: 'application/unknown',
              size: 12312,
              category: null,
              filePath: 'https://media.topcoder.com/projects/1/test.txt',
              createdBy: 1,
              updatedBy: 1,
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

  describe('DELETE /projects/{id}/attachments/{id}', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should return 403 if user does not have permissions', (done) => {
      request(server)
          .delete(`/v4/projects/${project1.id}/attachments/${attachment.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.member}`,
          })
          .send({ param: { userId: 1, projectId: project1.id, role: 'customer' } })
          .expect(403, done);
    });

    it('should return 404 if attachment was not found', (done) => {
      request(server)
          .delete(`/v4/projects/${project1.id}/attachments/8888888`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({ param: { userId: 1, projectId: project1.id, role: 'customer' } })
          .expect(404, done);
    });

    it('should return 204 if attachment was successfully removed', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        delete: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: true,
            },
          },
        }),
      });
      const deleteSpy = sinon.spy(mockHttpClient, 'delete');
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
          .delete(`/v4/projects/${project1.id}/attachments/${attachment.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .expect(204)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              deleteSpy.should.have.been.calledOnce;
              done();
            }
          });
    });
  });
});
