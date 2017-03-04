/* eslint-disable no-unused-expressions */
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import server from '../../app';
import models from '../../models';
import util from '../../util';
import testUtil from '../../tests/util';

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
  before((done) => {
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
            }).then(() => done());
          });
        });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects/{id}/attachments/', () => {
    it('should return 403 if user does not have permissions', (done) => {
      request(server)
          .post(`/v4/projects/${project1.id}/attachments/`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.member}`,
          })
          .send({ param: body })
          .expect('Content-Type', /json/)
          .expect(403, done);
    });

    it('should return 201 return attachment record', (done) => {
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
      const postSpy = sinon.spy(mockHttpClient, 'post');
      const getSpy = sinon.spy(mockHttpClient, 'get');
      const stub = sinon.stub(util, 'getHttpClient', () => mockHttpClient);
      // mock util s3FileTransfer
      util.s3FileTransfer = () => Promise.resolve(true);
      request(server)
          .post(`/v4/projects/${project1.id}/attachments/`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({ param: body })
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body.result.content;
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
  });
});
