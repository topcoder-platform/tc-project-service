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

describe('List phase members', () => {
  let id;
  let project;
  let phaseId;
  const copilotUser = {
    handle: testUtil.getDecodedToken(testUtil.jwts.copilot).handle,
    userId: testUtil.getDecodedToken(testUtil.jwts.copilot).userId,
    firstName: 'fname',
    lastName: 'lName',
    email: 'some@abc.com',
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
        id = p.id;
        project = p.toJSON();
        // create members
        models.ProjectMember.create({
          userId: copilotUser.userId,
          projectId: id,
          role: 'copilot',
          isPrimary: false,
          createdBy: 1,
          updatedBy: 1,
        }).then(() => {
          models.ProjectPhase.create({
            name: 'test project phase',
            projectId: id,
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
            models.ProjectPhaseMember.create({
              phaseId,
              userId: copilotUser.userId,
              createdBy: 1,
              updatedBy: 1,
            }).then((phaseMember) => {
              _.assign(phase, { members: [phaseMember.toJSON()] });
              // Index to ES
              // Overwrite lastActivityAt as otherwise ES fill not be able to parse it
              project.lastActivityAt = 1;
              project.phases = [phase];
              return eClient
                .index({
                  index: ES_PROJECT_INDEX,
                  id,
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
  describe('GET /projects/{projectId}/phases/{phaseId}/members', () => {
    it('should return 403 for anonymous user', (done) => {
      request(server)
        .get(`/v5/projects/${id}/phases/${phaseId}/members`)
        .expect(403, done);
    });

    it('should return 403 for non project member user', (done) => {
      request(server)
        .get(`/v5/projects/${id}/phases/${phaseId}/members`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect(403, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get(`/v5/projects/${id}/phases/${phaseId}/members`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for project admin', (done) => {
      request(server)
        .get(`/v5/projects/${id}/phases/${phaseId}/members`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get(`/v5/projects/${id}/phases/${phaseId}/members`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          should.exist(resJson);
          resJson.should.have.length(1);
          resJson[0].userId.should.be.eql(copilotUser.userId);
          resJson[0].phaseId.should.be.eql(phaseId);
          done();
        });
    });
  });
});
