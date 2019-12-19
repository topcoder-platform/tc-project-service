import sinon from 'sinon';
import request from 'supertest';
import _ from 'lodash';
import Promise from 'bluebird';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

import { PROJECT_STATUS, PROJECT_MEMBER_ROLE, SCOPE_CHANGE_REQ_STATUS } from '../../constants';

/**
 * Creates a project with given status
 * @param {string} status - Status of the project
 *
 * @returns {Promise} - promise for project creation
 */
function createProject(status) {
  const newMember = (userId, role, project) => ({
    userId,
    projectId: project.id,
    role,
    isPrimary: true,
    createdBy: 1,
    updatedBy: 1,
  });

  return models.Project.create({
    type: 'generic',
    billingAccountId: 1,
    name: 'test1',
    description: 'test project1',
    status,
    details: {},
    createdBy: 1,
    updatedBy: 1,
    lastActivityAt: 1,
    lastActivityUserId: '1',
  }).then(project =>
    Promise.all([
      models.ProjectMember.create(newMember(testUtil.userIds.member, PROJECT_MEMBER_ROLE.CUSTOMER, project)),
      models.ProjectMember.create(newMember(testUtil.userIds.manager, PROJECT_MEMBER_ROLE.MANAGER, project)),
    ]).then(() => project),
  );
}

/**
 * creates a new scope change request object
 * @returns {Object} - scope change request object
 */
function newScopeChangeRequest() {
  return {
    newScope: {
      appDefinition: {
        numberScreens: '5-8',
      },
    },
    oldScope: {
      appDefinition: {
        numberScreens: '2-4',
      },
    },
  };
}

/**
 * Asserts the status of the Scope change request
 * @param {Object} response - Response object from the post service
 * @param {string} expectedStatus - Expected status of the Scope Change Request
 *
 * @returns {undefined} - throws error if assertion failed
 */
function assertStatus(response, expectedStatus) {
  const status = _.get(response, 'body.status');
  sinon.assert.match(status, expectedStatus);
}

/**
 * Updaes the status of scope change requests for the given project in db
 * @param {Object} project - the project
 * @param {string} status - the new status for update
 *
 * @returns {Promise} the promise to update the status
 */
function updateScopeChangeStatuses(project, status) {
  return models.ScopeChangeRequest.update({ status }, { where: { projectId: project.id } });
}


describe('Create Scope Change Rquest', () => {
  let projects;
  let projectWithPendingChange;
  let projectWithApprovedChange;

  before((done) => {
    const projectStatuses = [
      PROJECT_STATUS.DRAFT,
      PROJECT_STATUS.IN_REVIEW,
      PROJECT_STATUS.REVIEWED,
      PROJECT_STATUS.ACTIVE,
    ];

    Promise.all(projectStatuses.map(status => createProject(status)))
      .then(_projects => _projects.map((project, i) => [projectStatuses[i], project]))
      .then((_projectStatusPairs) => {
        projects = _.fromPairs(_projectStatusPairs);
      })
      .then(() => done());
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST projects/{projectId}/scopeChangeRequests', () => {
    it('Should create scope change request for project in reviewed status', (done) => {
      const project = projects[PROJECT_STATUS.REVIEWED];

      request(server)
        .post(`/v5/projects/${project.id}/scopeChangeRequests`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(newScopeChangeRequest())
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            projectWithPendingChange = project;

            assertStatus(res, SCOPE_CHANGE_REQ_STATUS.PENDING);
            done();
          }
        });
    });

    it('Should create scope change request for project in active status', (done) => {
      const project = projects[PROJECT_STATUS.ACTIVE];

      request(server)
        .post(`/v5/projects/${project.id}/scopeChangeRequests`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(newScopeChangeRequest())
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            projectWithApprovedChange = project;

            assertStatus(res, SCOPE_CHANGE_REQ_STATUS.APPROVED);
            done();
          }
        });
    });

    it('Should return error with status 403 if project is in draft status', (done) => {
      const project = projects[PROJECT_STATUS.DRAFT];

      request(server)
        .post(`/v5/projects/${project.id}/scopeChangeRequests`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(newScopeChangeRequest())
        .expect(403)
        .end(err => done(err));
    });

    it('Should return error with status 403 if project is in in_review status', (done) => {
      const project = projects[PROJECT_STATUS.IN_REVIEW];

      request(server)
        .post(`/v5/projects/${project.id}/scopeChangeRequests`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(newScopeChangeRequest())
        .expect(403)
        .end(err => done(err));
    });

    it('Should return error with status 404 if project not present', (done) => {
      const nonExistentProjectId = 341212;
      request(server)
        .post(`/v5/projects/${nonExistentProjectId}/scopeChangeRequests`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(newScopeChangeRequest())
        .expect(404)
        .end(err => done(err));
    });

    it('Should return error with status 403 if there is a request in pending status', (done) => {
      request(server)
        .post(`/v5/projects/${projectWithPendingChange.id}/scopeChangeRequests`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(newScopeChangeRequest())
        .expect(403)
        .end(err => done(err));
    });

    it('Should return error with status 403 if there is a request in approved status', (done) => {
      request(server)
        .post(`/v5/projects/${projectWithApprovedChange.id}/scopeChangeRequests`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(newScopeChangeRequest())
        .expect(403)
        .end(err => done(err));
    });

    it('Should create scope change request if there is a request in canceled status', (done) => {
      updateScopeChangeStatuses(projectWithApprovedChange, SCOPE_CHANGE_REQ_STATUS.CANCELED).then(() => {
        request(server)
          .post(`/v5/projects/${projectWithApprovedChange.id}/scopeChangeRequests`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.member}`,
          })
          .send(newScopeChangeRequest())
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              assertStatus(res, SCOPE_CHANGE_REQ_STATUS.APPROVED);
              done();
            }
          });
      });
    });

    it('Should create scope change request if there is a request in rejected status', (done) => {
      updateScopeChangeStatuses(projectWithApprovedChange, SCOPE_CHANGE_REQ_STATUS.REJECTED).then(() => {
        request(server)
          .post(`/v5/projects/${projectWithApprovedChange.id}/scopeChangeRequests`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.member}`,
          })
          .send(newScopeChangeRequest())
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              assertStatus(res, SCOPE_CHANGE_REQ_STATUS.APPROVED);
              done();
            }
          });
      });
    });

    it('Should create scope change request if there is a request in activated status', (done) => {
      updateScopeChangeStatuses(projectWithApprovedChange, SCOPE_CHANGE_REQ_STATUS.ACTIVATED).then(() => {
        request(server)
          .post(`/v5/projects/${projectWithApprovedChange.id}/scopeChangeRequests`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.member}`,
          })
          .send(newScopeChangeRequest())
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              assertStatus(res, SCOPE_CHANGE_REQ_STATUS.APPROVED);
              done();
            }
          });
      });
    });
  });
});
