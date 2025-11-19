/**
 * Tests for delete.js
 */
import request from 'supertest';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

describe('Delete phase member', () => {
  let id;
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
  before((done) => {
    // mocks
    testUtil.clearDb()
      .then(() => models.Project.create({
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
      }))
      .then((project) => {
        id = project.id;
        return models.ProjectMember.bulkCreate([{
          userId: copilotUser.userId,
          projectId: id,
          role: 'copilot',
          isPrimary: false,
          createdBy: 1,
          updatedBy: 1,
        }, {
          userId: memberUser.userId,
          projectId: id,
          role: 'customer',
          isPrimary: true,
          createdBy: 1,
          updatedBy: 1,
        }]);
      })
      .then(() => models.ProjectPhase.create({
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
      }))
      .then((phase) => {
        phaseId = phase.id;
        return models.ProjectPhaseMember.create({
          phaseId,
          userId: copilotUser.userId,
          createdBy: 1,
          updatedBy: 1,
        });
      })
      .then(() => done())
      .catch(done);
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
        where: { userId: testUtil.userIds.copilot, projectId: id },
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
