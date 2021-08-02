/**
 * Tests for delete.js
 */
import _ from 'lodash';
import config from 'config';
import request from 'supertest';
import util from '../../util';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');
const eClient = util.getElasticSearchClient();

describe('Delete phase member', () => {
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
  const memberUser = {
    handle: testUtil.getDecodedToken(testUtil.jwts.member).handle,
    userId: testUtil.getDecodedToken(testUtil.jwts.member).userId,
    firstName: 'fname',
    lastName: 'lName',
    email: 'some@abc.com',
  };
  before(function beforeHook(done) {
    this.timeout(20000);
    // mocks
    testUtil.clearDb()
      .then(() => testUtil.clearES())
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
          id = p.id;
          project = p.toJSON();
          // create members
          models.ProjectMember.bulkCreate([{
            id: 1,
            userId: copilotUser.userId,
            projectId: id,
            role: 'copilot',
            isPrimary: false,
            createdBy: 1,
            updatedBy: 1,
          }, {
            id: 2,
            userId: memberUser.userId,
            projectId: id,
            role: 'customer',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          }]).then(() => {
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
                return eClient.index({
                  index: ES_PROJECT_INDEX,
                  type: ES_PROJECT_TYPE,
                  id,
                  body: project,
                }).then(() => {
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
  describe('DELETE /projects/{projectId}/phases/{phaseId}/members/{userId}', () => {
    it('should return 403 for anonymous user', (done) => {
      request(server)
        .delete(`/v5/projects/${id}/phases/${phaseId}/members/${copilotUser.userId}`)
        .expect(403, done);
    });

    it('should return 403 for regular user', (done) => {
      request(server)
        .delete(`/v5/projects/${id}/phases/${phaseId}/members/${copilotUser.userId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 204 for connect admin', (done) => {
      request(server)
        .delete(`/v5/projects/${id}/phases/${phaseId}/members/${copilotUser.userId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(204, done);
    });

    it('should return 204 for project admin', (done) => {
      request(server)
        .delete(`/v5/projects/${id}/phases/${phaseId}/members/${copilotUser.userId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204, done);
    });

    it('should return 204 for copilot which is member of project', (done) => {
      request(server)
        .delete(`/v5/projects/${id}/phases/${phaseId}/members/${copilotUser.userId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(204, done);
    });

    it('should return 403 for copilot which is not member of project', (done) => {
      models.ProjectMember.destroy({
        where: { userId: testUtil.userIds.copilot, id },
      }).then(() => {
        request(server)
          .delete(`/v5/projects/${id}/phases/${phaseId}/members/${copilotUser.userId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .expect(403, done);
      });
    });
  });
});
