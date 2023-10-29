/**
 * Tests for delete.js
 */
import _ from 'lodash';
import request from 'supertest';
import chai from 'chai';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const expectAfterDelete = (permissionId, err, next) => {
  if (err) throw err;
  setTimeout(() =>
    models.WorkManagementPermission.findOne({
      where: {
        id: permissionId,
      },
      paranoid: false,
    })
      .then((res) => {
        if (!res) {
          throw new Error('Should found the entity');
        } else {
          chai.assert.isNotNull(res.deletedAt);
          chai.assert.isNotNull(res.deletedBy);

          request(server)
            .get(`/v5/projects/metadata/workManagementPermission/${permissionId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404)
            .end(next);
        }
      }), 500);
};

describe('DELETE work management permission', () => {
  let permissionId;

  const memberUser = {
    handle: testUtil.getDecodedToken(testUtil.jwts.member).handle,
    userId: testUtil.getDecodedToken(testUtil.jwts.member).userId,
    firstName: 'fname',
    lastName: 'lName',
    email: 'some@abc.com',
  };
  const copilotUser = {
    handle: testUtil.getDecodedToken(testUtil.jwts.copilot).handle,
    userId: testUtil.getDecodedToken(testUtil.jwts.copilot).userId,
    firstName: 'fname',
    lastName: 'lName',
    email: 'some@abc.com',
  };

  let permission = {
    policy: 'work.create',
    permission: {
      allowRule: {
        projectRoles: ['customer', 'copilot'],
        topcoderRoles: ['Connect Manager', 'Connect Admin', 'administrator'],
      },
      denyRule: { projectRoles: ['copilot'] },
    },
    createdBy: 1,
    updatedBy: 1,
  };

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => {
        models.ProjectTemplate.create({
          name: 'template 2',
          key: 'permissionId 2',
          category: 'category 2',
          icon: 'http://example.com/icon1.ico',
          question: 'question 2',
          info: 'info 2',
          aliases: ['permissionId-2', 'key_2'],
          scope: {},
          phases: {},
          createdBy: 1,
          updatedBy: 2,
        })
          .then((t) => {
            permission = _.assign({}, permission, { projectTemplateId: t.id });
            // Create projects
            models.Project.create({
              type: 'generic',
              billingAccountId: 1,
              name: 'test1',
              description: 'test project1',
              status: 'draft',
              templateId: t.id,
              details: {},
              createdBy: 1,
              updatedBy: 1,
              lastActivityAt: 1,
              lastActivityUserId: '1',
            })
              .then((project) => {
                // create members
                models.ProjectMember.bulkCreate([{
                  id: 1,
                  userId: copilotUser.userId,
                  projectId: project.id,
                  role: 'copilot',
                  isPrimary: false,
                  createdBy: 1,
                  updatedBy: 1,
                }, {
                  id: 2,
                  userId: memberUser.userId,
                  projectId: project.id,
                  role: 'customer',
                  isPrimary: true,
                  createdBy: 1,
                  updatedBy: 1,
                }]).then(() => {
                  models.WorkManagementPermission.create(permission)
                    .then((p) => {
                      permissionId = p.id;
                    })
                    .then(() => done());
                });
              });
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });


  describe('DELETE /projects/metadata/workManagementPermission/{permissionId}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/workManagementPermission/${permissionId}`)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed permission', (done) => {
      request(server)
        .delete('/v5/projects/metadata/workManagementPermission/123')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted permission', (done) => {
      models.WorkManagementPermission.destroy({ where: { id: permissionId } })
        .then(() => {
          request(server)
            .delete(`/v5/projects/metadata/workManagementPermission/${permissionId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 204, for admin, if permission was successfully removed', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(permissionId, err, done));
    });

    it('should return 204, for connect admin, if permission was successfully removed', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(permissionId, err, done));
    });
  });
});
