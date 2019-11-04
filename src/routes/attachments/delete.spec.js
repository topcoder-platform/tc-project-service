/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import sinon from 'sinon';
import request from 'supertest';
import chai from 'chai';

import models from '../../models';
import util from '../../util';
import server from '../../app';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import { BUS_API_EVENT, RESOURCES, CONNECT_NOTIFICATION_EVENT } from '../../constants';

const should = chai.should(); // eslint-disable-line no-unused-vars

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
          .delete(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.member}`,
          })
          .send({ userId: 1, projectId: project1.id, role: 'customer' })
          .expect(403, done);
    });

    it('should return 404 if attachment was not found', (done) => {
      request(server)
          .delete(`/v5/projects/${project1.id}/attachments/8888888`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({ userId: 1, projectId: project1.id, role: 'customer' })
          .expect(404, done);
    });

    it('should return 204 if the CREATOR removes the attachment successfully', (done) => {
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
          .delete(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .expect(204)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              setTimeout(() =>
                models.ProjectAttachment.findOne({
                  where: {
                    projectId: project1.id,
                    id: attachment.id,
                  },
                  paranoid: false,
                })
                  .then((res) => {
                    if (!res) {
                      throw new Error('Should found the entity');
                    } else {
                      deleteSpy.calledOnce.should.be.true;

                      chai.assert.isNotNull(res.deletedAt);
                      chai.assert.isNotNull(res.deletedBy);

                      request(server)
                        .get(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
                        .set({
                          Authorization: `Bearer ${testUtil.jwts.admin}`,
                        })
                        .expect(404, done);
                    }
                  }), 500);
            }
          });
    });

    it('should return 204 if ADMIN deletes the attachment successfully', (done) => {
      request(server)
          .delete(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({ userId: 1, projectId: project1.id, role: 'customer' })
          .expect(204, done)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              request(server)
              .get(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
              .set({
                Authorization: `Bearer ${testUtil.jwts.admin}`,
              })
              .expect(404, done);
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

      it('sends send correct BUS API messages  when attachment deleted', (done) => {
        request(server)
          .delete(`/v5/projects/${project1.id}/attachments/${attachment.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .expect(204)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              // Wait for app message handler to complete
              testUtil.wait(() => {
                createEventSpy.calledTwice.should.be.true;

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_ATTACHMENT_REMOVED, sinon.match({
                  resource: RESOURCES.ATTACHMENT,
                  id: attachment.id,
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
