/* eslint-disable no-unused-expressions */
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import server from '../../app';
import models from '../../models';
import util from '../../util';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import { BUS_API_EVENT, RESOURCES } from '../../constants';

const should = chai.should();

const body = {
  title: 'Spec.pdf',
  description: '',
  category: 'appDefinition',
  filePath: 'projects/1/spec.pdf',
  s3Bucket: 'submissions-staging-dev',
  contentType: 'application/pdf',
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
              filePath: 'tmp/spec.pdf',
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
              filePath: 'tmp/spec.pdf',
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
          .send(body)
          .expect('Content-Type', /json/)
          .expect(403, done);
    });

    it('should return 201 return attachment record', (done) => {
      request(server)
          .post(`/v5/projects/${project1.id}/attachments/`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send(body)
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
              resJson.title.should.equal('Spec.pdf');
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

      it('sends BUS_API_EVENT.PROJECT_ATTACHMENT_ADDED message when attachment added', (done) => {
        request(server)
          .post(`/v5/projects/${project1.id}/attachments/`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send(body)
          .expect(201)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              // Wait for app message handler to complete
              testUtil.wait(() => {
                createEventSpy.calledOnce.should.be.true;
                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_ATTACHMENT_ADDED,
                  sinon.match({ resource: RESOURCES.ATTACHMENT })).should.be.true;
                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_ATTACHMENT_ADDED,
                  sinon.match({ title: body.title })).should.be.true;
                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_ATTACHMENT_ADDED,
                  sinon.match({ description: body.description })).should.be.true;
                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_ATTACHMENT_ADDED,
                  sinon.match({ category: body.category })).should.be.true;
                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_ATTACHMENT_ADDED,
                  sinon.match({ contentType: body.contentType })).should.be.true;
                done();
              });
            }
          });
      });
    });
  });
});
