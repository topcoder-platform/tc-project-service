import sinon from 'sinon';
import request from 'supertest';
import _ from 'lodash';

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
 * Asserts the status of the Scope change request
 * @param {Object} updatedScopeChangeRequest - the updated scope change request from db
 * @param {string} expectedStatus - Expected status of the Scope Change Request
 *
 * @returns {undefined} - throws error if assertion failed
 */
function assertStatus(updatedScopeChangeRequest, expectedStatus) {
  sinon.assert.match(updatedScopeChangeRequest.status, expectedStatus);
}

/**
 * create scope change request for the given project
 * @param {Object} project - the project
 *
 * @returns {Promise} - the promise to create scope change request
 */
function createScopeChangeRequest(project) {
  return models.ScopeChangeRequest.create({
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
    projectId: project.id,
    status: SCOPE_CHANGE_REQ_STATUS.PENDING,
    createdBy: 1,
    updatedBy: 1,
    lastActivityAt: 1,
    lastActivityUserId: '1',
  });
}

/**
 * Updates the details json of the project
 * @param {string} projectId The project id
 * @param {Object} detailsChange The changes to be merged with details json
 *
 * @returns {Promise} A promise to update details json in the project
 */
function updateProjectDetails(projectId, detailsChange) {
  return models.Project.findByPk(projectId).then((project) => {
    const updatedDetails = _.merge({}, project.details, detailsChange);
    return project.update({ details: updatedDetails });
  });
}

describe('Update Scope Change Rquest', () => {
  let project;
  let scopeChangeRequest;

  before((done) => {
    testUtil
      .clearDb()
      .then(() => createProject(PROJECT_STATUS.REVIEWED))
      .then((_project) => {
        project = _project;
        return project;
      })
      .then(_project => createScopeChangeRequest(_project))
      .then((_scopeChangeRequest) => {
        scopeChangeRequest = _scopeChangeRequest;
        return scopeChangeRequest;
      })
      .then(() => done());
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('PATCH projects/{projectId}/scopeChangeRequests/{requestId}', () => {
    it('Should approve change request with customer login', (done) => {
      request(server)
        .patch(`/v5/projects/${project.id}/scopeChangeRequests/${scopeChangeRequest.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send({
          status: SCOPE_CHANGE_REQ_STATUS.APPROVED,
        })
        .expect(200)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            models.ScopeChangeRequest.findOne({ where: { id: scopeChangeRequest.id } }).then((_scopeChangeRequest) => {
              assertStatus(_scopeChangeRequest, SCOPE_CHANGE_REQ_STATUS.APPROVED);
              done();
            });
          }
        });
    });

    it('Should activate change request with manager login', (done) => {
      // Updating project details before activation. This is used in a later test case
      updateProjectDetails(project.id, { apiDefinition: { notes: 'Please include swagger docs' } }).then(() => {
        request(server)
          .patch(`/v5/projects/${project.id}/scopeChangeRequests/${scopeChangeRequest.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.manager}`,
          })
          .send({
            status: SCOPE_CHANGE_REQ_STATUS.ACTIVATED,
          })
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              models.ScopeChangeRequest.findOne({ where: { id: scopeChangeRequest.id } })
                .then((_scopeChangeRequest) => {
                  assertStatus(_scopeChangeRequest, SCOPE_CHANGE_REQ_STATUS.ACTIVATED);
                  done();
                });
            }
          });
      });
    });

    it('Should update details field of project on activation', (done) => {
      models.Project.findOne({ where: { id: project.id } }).then((_project) => {
        const numberScreens = _.get(_project, 'details.appDefinition.numberScreens');
        sinon.assert.match(numberScreens, '5-8');
        done();
      });
    });

    it("Should preserve fields of details json that doesn't change the scope on activation", (done) => {
      models.Project.findOne({ where: { id: project.id } }).then((_project) => {
        const apiNotes = _.get(_project, 'details.apiDefinition.notes');
        sinon.assert.match(apiNotes, 'Please include swagger docs');
        done();
      });
    });

    it('Should not allow updating oldScope', (done) => {
      request(server)
        .patch(`/v5/projects/${project.id}/scopeChangeRequests/${scopeChangeRequest.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          oldScope: {},
        })
        .expect(400)
        .end(err => done(err));
    });

    it('Should not allow updating newScope', (done) => {
      request(server)
        .patch(`/v5/projects/${project.id}/scopeChangeRequests/${scopeChangeRequest.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          newScope: {},
        })
        .expect(400)
        .end(err => done(err));
    });
  });
});
