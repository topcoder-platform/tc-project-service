/**
 * Tests for list.js
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
const eClient = util.getElasticSearchClient();

describe('List phase approvals', () => {
  let projectId;
  let phaseId;
  const approvalObject = {
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
    resJson.startDate.should.be
      .a('string')
      .and.satisfy((date) => date.startsWith(expectedApproval.startDate));
    resJson.endDate.should.be
      .a('string')
      .and.satisfy((date) => date.startsWith(expectedApproval.endDate));
    resJson.expectedEndDate.should.be
      .a('string')
      .and.satisfy((date) => date.startsWith(expectedApproval.expectedEndDate));
  };
  before((done) => {
    // mocks
    testUtil.clearDb().then(() => {
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
        models.ProjectMember.bulkCreate([
          {
            userId: testUtil.userIds.member,
            projectId,
            role: 'customer',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          },
          {
            userId: testUtil.userIds.copilot,
            projectId,
            role: 'copilot',
            isPrimary: false,
            createdBy: 1,
            updatedBy: 1,
          },
        ]).then(() => {
          models.ProjectPhase.create({
            name: 'test project phase',
            projectId,
            status: 'active',
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
            models.ProjectPhaseApproval.create(
              _.assign(approvalObject, {
                phaseId,
                createdBy: 1,
                updatedBy: 1,
              }),
            ).then((pa) => {
              _.assign(phase, { approvals: [pa.toJSON()] });
              // Index to ES
              // Overwrite lastActivityAt as otherwise ES fill not be able to parse it
              project.lastActivityAt = 1;
              project.phases = [phase];
              return eClient
                .index({
                  index: ES_PROJECT_INDEX,
                  id: project.id,
                  body: project,
                })
                .then(() => {
                  done();
                });
            });
          });
        });
      });
    });
  });

  after((done) => {
    testUtil.clearDb(done);
  });
  describe('GET /projects/{projectId}/phases/{phaseId}/approvals', () => {
    it('should return 403 for anonymous user', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .expect(403, done);
    });

    it('should return 403 for non project member user', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect(403, done);
    });

    it('should return 200 for project customer user', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          validateApproval(resJson[0], approvalObject);
          done();
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          validateApproval(resJson[0], approvalObject);
          done();
        });
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          validateApproval(resJson[0], approvalObject);
          done();
        });
    });

    it('should return 200 for manager', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          validateApproval(resJson[0], approvalObject);
          done();
        });
    });

    it('should return 200 for project copilot user', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          validateApproval(resJson[0], approvalObject);
          done();
        });
    });

    it('should return 403 for non project copilot user', (done) => {
      models.ProjectMember.destroy({
        where: { userId: testUtil.userIds.copilot, projectId },
      }).then(() => {
        request(server)
          .get(`/v5/projects/${projectId}/phases/${phaseId}/approvals`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .expect(403, done);
      });
    });
  });
});
