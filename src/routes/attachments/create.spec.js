/* eslint-disable no-unused-expressions */
import chai from 'chai';
import sinon from 'sinon';
import _ from 'lodash';
import request from 'supertest';
import server from '../../app';
import models from '../../models';
import util from '../../util';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import { BUS_API_EVENT, RESOURCES, CONNECT_NOTIFICATION_EVENT, ATTACHMENT_TYPES } from '../../constants';

const should = chai.should();

const fileAttachmentBody = {
  title: 'Spec.pdf',
  description: 'attachment file description',
  category: 'appDefinition',
  path: 'projects/1/spec.pdf',
  type: ATTACHMENT_TYPES.FILE,
  tags: ['tag1', 'tag2', 'tag3'],
  s3Bucket: 'submissions-staging-dev',
  contentType: 'application/pdf',
};

const linkAttachmentBody = {
  title: 'link title',
  description: 'link description',
  category: 'appDefinition',
  path: 'https://connect.topcoder-dev.com/projects/8600/assets',
  type: ATTACHMENT_TYPES.LINK,
  tags: ['tag4', 'tag5'],
};

describe('Project Attachments', () => {
  let project1;
  let postSpy;
  let getSpy;
  let stub;
  let sandbox;

  beforeEach((done) => {
    const mockHttpClient = {
      defaults: { headers: { common: {} } },
      post: () => new Promise(resolve => resolve({
        status: 200,
        data: {
          status: 200,
          result: {
            success: true,
            status: 200,
            content: {
              path: 'tmp/spec.pdf',
              preSignedURL: 'www.topcoder.com/media/spec.pdf',
            },
          },
        },
      })),
      get: () => new Promise(resolve => resolve({
        status: 200,
        data: {
          result: {
            success: true,
            status: 200,
            content: {
              path: 'tmp/spec.pdf',
              preSignedURL: 'http://topcoder-media.s3.amazon.com/projects/1/spec.pdf',
            },
          },
        },
      })),
    };

    // mocks
    testUtil.clearDb()
      .then(() => {
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
        }).then((p) => {
          project1 = p;
          // create members
          models.ProjectMember.create({
            userId: 40051332,
            projectId: project1.id,
            role: 'copilot',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          }).then(() => {
            sandbox = sinon.sandbox.create();
            postSpy = sandbox.spy(mockHttpClient, 'post');
            getSpy = sandbox.spy(mockHttpClient, 'get');
            stub = sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
            sandbox.stub(util, 's3FileTransfer').returns(Promise.resolve(true));
            done();
          });
        });
      });
  });

  afterEach((done) => {
    sandbox.restore();
    testUtil.clearDb(done);
  });

  describe('POST /projects/{id}/attachments/', () => {
    it('should return 403 if user does not have permissions', (done) => {
      request(server)
        .post(`/v5/projects/${project1.id}/attachments/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(fileAttachmentBody)
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 400 if contentType is not provided for file attachment', (done) => {
      const payload = _.omit(_.cloneDeep(fileAttachmentBody), 'contentType');
      request(server)
        .post(`/v5/projects/${project1.id}/attachments/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if s3Bucket is not provided for file attachment', (done) => {
      const payload = _.omit(_.cloneDeep(fileAttachmentBody), 's3Bucket');
      request(server)
        .post(`/v5/projects/${project1.id}/attachments/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(payload)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should properly create file attachment - 201', (done) => {
      request(server)
        .post(`/v5/projects/${project1.id}/attachments/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(fileAttachmentBody)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            postSpy.should.have.been.calledOnce;
            getSpy.should.have.been.calledOnce;
            stub.restore();
            resJson.title.should.equal(fileAttachmentBody.title);
            resJson.tags.should.eql(fileAttachmentBody.tags);
            resJson.type.should.eql(fileAttachmentBody.type);
            resJson.downloadUrl.should.exist;
            resJson.projectId.should.equal(project1.id);
            done();
          }
        });
    });

    it('should properly create link attachment - 201', (done) => {
      request(server)
        .post(`/v5/projects/${project1.id}/attachments/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(linkAttachmentBody)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            postSpy.should.have.been.calledOnce;
            getSpy.should.have.been.calledOnce;
            stub.restore();
            resJson.title.should.equal(linkAttachmentBody.title);
            resJson.path.should.equal(linkAttachmentBody.path);
            resJson.description.should.equal(linkAttachmentBody.description);
            resJson.type.should.equal(linkAttachmentBody.type);
            resJson.tags.should.eql(linkAttachmentBody.tags);
            resJson.projectId.should.equal(project1.id);
            done();
          }
        });
    });

    it('should create project successfully using M2M token with "write:projects" scope', (done) => {
      request(server)
        .post(`/v5/projects/${project1.id}/attachments/`)
        .set({
          Authorization: `Bearer ${testUtil.m2m['write:projects']}`,
        })
        .send(fileAttachmentBody)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            postSpy.should.have.been.calledOnce;
            getSpy.should.have.been.calledOnce;
            stub.restore();
            resJson.title.should.equal(fileAttachmentBody.title);
            resJson.tags.should.eql(fileAttachmentBody.tags);
            resJson.type.should.eql(fileAttachmentBody.type);
            resJson.downloadUrl.should.exist;
            resJson.projectId.should.equal(project1.id);
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
        createEventSpy = sandbox.spy(busApi, 'createEvent');
      });

      it('should send correct BUS API messages when file attachment added', (done) => {
        request(server)
          .post(`/v5/projects/${project1.id}/attachments/`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send(fileAttachmentBody)
          .expect(201)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              // Wait for app message handler to complete
              testUtil.wait(() => {
                createEventSpy.calledThrice.should.be.true;

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_ATTACHMENT_ADDED, sinon.match({
                  resource: RESOURCES.ATTACHMENT,
                  title: fileAttachmentBody.title,
                  description: fileAttachmentBody.description,
                  category: fileAttachmentBody.category,
                  contentType: fileAttachmentBody.contentType,
                  type: fileAttachmentBody.type,
                  tags: fileAttachmentBody.tags,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_FILE_UPLOADED)
                  .should.be.true;
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_ATTACHMENT_UPDATED, sinon.match({
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

      it('should send correct BUS API messages when link attachment added', (done) => {
        request(server)
          .post(`/v5/projects/${project1.id}/attachments/`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send(linkAttachmentBody)
          .expect(201)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              // Wait for app message handler to complete
              testUtil.wait(() => {
                createEventSpy.calledThrice.should.be.true;

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_ATTACHMENT_ADDED, sinon.match({
                  resource: RESOURCES.ATTACHMENT,
                  title: linkAttachmentBody.title,
                  description: linkAttachmentBody.description,
                  category: linkAttachmentBody.category,
                  type: linkAttachmentBody.type,
                  path: linkAttachmentBody.path,
                  tags: linkAttachmentBody.tags,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_LINK_CREATED)
                  .should.be.true;
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_ATTACHMENT_UPDATED, sinon.match({
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
