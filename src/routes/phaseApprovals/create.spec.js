/**
 * Tests for update.js
 */
import _ from 'lodash';
import config from 'config';
import request from 'supertest';
import chai from 'chai';
import util from '../../util';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');
const eClient = util.getElasticSearchClient();

describe('Create phase approvals', () => {
  let projectId;
  let phaseId;
  const requestBody = {
    decision: 'approve',
    comment: 'good',
    startDate: '2021-08-02',
    endDate: '2021-08-03',
    expectedEndDate: '2021-08-03',
  };
  const validateApproval = (resJson, expectedApproval) => {
    should.exist(resJson);
    resJson.decision.should.be.eql(expectedApproval.decision);
    resJson.comment.should.be.eql(expectedApproval.comment);
    resJson.startDate.should.be.a('string').and.satisfy(date =>
      date.startsWith(expectedApproval.startDate));
    resJson.endDate.should.be.a('string').and.satisfy(date =>
      date.startsWith(expectedApproval.endDate));
    resJson.expectedEndDate.should.be.a('string').and.satisfy(date =>
      date.startsWith(expectedApproval.expectedEndDate));
  };
  const validateError = (resJson, expectedMessage) => {
    should.exist(resJson);
    resJson.message.should.be.eql(expectedMessage);
  };
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
          lastActivityAt: 1,
          lastActivityUserId: '1',
        }).then((p) => {
          const project = p.toJSON();
          projectId = project.id;
          // create members
          models.ProjectMember.create({
            userId: testUtil.userIds.member,
            projectId,
            role: 'customer',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          }).then(() => {
            models.ProjectPhase.create({
              name: 'test project phase',
              projectId,
              status: 'in_review',
              startDate: '2018-05-15T00:00:00Z',
              endDate: '2018-05-15T12:00:00Z',
              budget: 20.0,
              progress: 1.23456,
              details: {
                message: 'This can be any json',
              },
              createdBy: 1,
              updatedBy: 1,
            }).then((ph) => {
              const phase = ph.toJSON();
              phaseId = phase.id;
              // Index to ES
              // Overwrite lastActivityAt as otherwise ES fill not be able to parse it
              project.lastActivityAt = 1;
              project.phases = [phase];
              return eClient.index({
                index: ES_PROJECT_INDEX,
                type: ES_PROJECT_TYPE,
                id: project.id,
                body: project,
              }).then(() => {
                done();
              });
            });
          });
        });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });
  describe('POST /projects/{projectId}/phases/{phaseId}/approvals', () => {
    it('should return 403 for anonymous user', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .send(requestBody)
        .expect(403, done);
    });

    it('should return 403 for non project user', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send(requestBody)
        .expect(403, done);
    });

    it('should return 403 for connect admin', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(requestBody)
        .expect(403, done);
    });

    it('should return 403 for admin', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(requestBody)
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(requestBody)
        .expect(403, done);
    });

    it('should return 200 for project customer', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(requestBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          validateApproval(resJson, requestBody);
          done();
        });
    });

    it('should update phase status to "reviewed" after approve', (done) => {
      models.ProjectPhase.findOne({ id: phaseId }).then((phase) => {
        phase.dataValues.status.should.be.eql('reviewed');
        done();
      });
    });

    it('should return 400 when decision field is missing', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(_.omit(requestBody, 'decision'))
        .expect(400)
        .end((err, res) => {
          const resJson = res.body;
          validateError(resJson, 'validation error: "decision" is required');
          done();
        });
    });

    it.skip('should return 400 when startDate field is missing', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(_.omit(requestBody, 'startDate'))
        .expect(400)
        .end((err, res) => {
          const resJson = res.body;
          validateError(resJson, 'validation error: "startDate" is required,' +
          '"endDate" references "startDate" which is not a date,' +
          '"expectedEndDate" references "startDate" which is not a date');
          done();
        });
    });

    it.skip('should return 400 when expectedEndDate field is missing', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(_.omit(requestBody, 'expectedEndDate'))
        .expect(400)
        .end((err, res) => {
          const resJson = res.body;
          validateError(resJson, 'validation error: "expectedEndDate" is required');
          done();
        });
    });

    it('should return 400 when decision field is invalid', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(_.assign({}, requestBody, { decision: 'ok' }))
        .expect(400)
        .end((err, res) => {
          const resJson = res.body;
          validateError(resJson, 'validation error: "decision" must be one of [approve, reject]');
          done();
        });
    });

    it('should return 400 when comment field is invalid', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(_.assign({}, requestBody, { comment: '' }))
        .expect(400)
        .end((err, res) => {
          const resJson = res.body;
          validateError(resJson, 'validation error: "comment" is not allowed to be empty');
          done();
        });
    });

    it('should return 400 when endDate is before startDate', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(_.assign({}, requestBody, { endDate: '2021-08-01' }))
        .expect(400)
        .end((err, res) => {
          const resJson = res.body;
          resJson.message.should.be.a('string').and.satisfy(message =>
            message.startsWith('validation error: "endDate" must be larger than or equal to'));
          done();
        });
    });

    it('should return 400 when phase status is not in_review', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(requestBody)
        .expect(400)
        .end((err, res) => {
          const resJson = res.body;
          validateError(resJson, `Phase with id ${phaseId} must be in_review status to make approval`);
          done();
        });
    });
  });
});
