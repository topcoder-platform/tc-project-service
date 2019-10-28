/* eslint-disable no-unused-expressions */
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import { BUS_API_EVENT, RESOURCES, CONNECT_NOTIFICATION_EVENT } from '../../constants';

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
            }).then(() => models.ProjectAttachment.create({
              projectId: project1.id,
              title: 'test.txt',
              description: 'blah',
              contentType: 'application/unknown',
              size: 12312,
              category: null,
              filePath: 'https://media.topcoder.com/projects/1/test.txt',
              createdBy: testUtil.userIds.copilot,
              updatedBy: 1,
              allowedUsers: [],
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
        .patch(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send({ title: 'updated title', description: 'updated description' })
        .expect(403, done);
    });

    it('should return 404 if attachment was not found', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}/attachments/8888888`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ title: 'updated title', description: 'updated description' })
        .expect(404, done);
    });

    it('should return 200 if attachment was successfully updated', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ title: 'updated title', description: 'updated description' })
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.title.should.equal('updated title');
            resJson.description.should.equal('updated description');
            done();
          }
        });
    });

    it('should return 200 if admin updates the attachment', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ title: 'updated title 1', description: 'updated description 1' })
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.title.should.equal('updated title 1');
            resJson.description.should.equal('updated description 1');
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
        createEventSpy = sandbox.stub(busApi, 'createEvent');
      });

      it('sends send correct BUS API messages when attachment updated', (done) => {
        request(server)
          .patch(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({ title: 'updated title', description: 'updated description' })
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              // Wait for app message handler to complete
              testUtil.wait(() => {
                createEventSpy.calledTwice.should.be.true;

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_ATTACHMENT_UPDATED, sinon.match({
                  resource: RESOURCES.ATTACHMENT,
                  title: 'updated title',
                  description: 'updated description',
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_FILES_UPDATED, sinon.match({
                  projectId: project1.id,
                  projectName: project1.name,
                  projectUrl: `https://local.topcoder-dev.com/projects/${project1.id}`,
                  userId: 40051333,
                  initiatorUserId: 40051333,
                })).should.be.true;

                done();
              });
            }
          });
      });
    });
  });
});
