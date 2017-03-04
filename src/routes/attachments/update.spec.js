/* eslint-disable no-unused-expressions */
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('Project Attachments update', () => {
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

  describe('Update /projects/{id}/attachments/{id}', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should return 403 if user does not have permissions', (done) => {
      request(server)
        .patch(`/v4/projects/${project1.id}/attachments/${attachment.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send({ param: { title: 'updated title', description: 'updated description' } })
        .expect(403, done);
    });

    it('should return 404 if attachment was not found', (done) => {
      request(server)
        .patch(`/v4/projects/${project1.id}/attachments/8888888`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: { title: 'updated title', description: 'updated description' } })
        .expect(404, done);
    });

    it('should return 200 if attachment was successfully updated', (done) => {
      request(server)
        .patch(`/v4/projects/${project1.id}/attachments/${attachment.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: { title: 'updated title', description: 'updated description' } })
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.title.should.equal('updated title');
            resJson.description.should.equal('updated description');
            done();
          }
        });
    });
  });
});
