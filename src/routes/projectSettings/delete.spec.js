/**
 * Tests for delete.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';

import server from '../../app';
import testUtil from '../../tests/util';
import models from '../../models';

const should = chai.should();

const expectAfterDelete = (id, projectId, len, deletedLen, err, next) => {
  if (err) throw err;

  models.ProjectSetting.findOne({
    includeAllProjectSettingsForInternalUsage: true,
    where: {
      id,
      projectId,
    },
    paranoid: false,
  })
    .then((res) => {
      if (!res) {
        throw new Error('Should found the entity');
      } else {
        should.exist(res.deletedBy);
        should.exist(res.deletedAt);

        // find deleted ProjectEstimationItems for project
        models.ProjectEstimationItem.findAllByProject(models, projectId, {
          where: {
            deletedAt: { $ne: null },
          },
          includeAllProjectEstimatinoItemsForInternalUsage: true,
          paranoid: false,
        }).then((items) => {
        // deleted project estimation items
          items.should.have.lengthOf(deletedLen, 'Number of deleted ProjectEstimationItems doesn\'t match');
          _.each(items, (item) => {
            should.exist(item.deletedBy);
            should.exist(item.deletedAt);
          });

          // find (non-deleted) ProjectEstimationItems for project
          return models.ProjectEstimationItem.findAllByProject(models, projectId, {
            includeAllProjectEstimatinoItemsForInternalUsage: true,
          });
        }).then((items) => {
        // all non-deleted project estimation item count
          items.should.have.lengthOf(len, 'Number of created ProjectEstimationItems doesn\'t match');
          next();
        }).catch(next);
      }
    });
};

describe('DELETE Project Setting', () => {
  let projectId;
  let estimationId;
  let id;
  let id2;

  const estimation = {
    buildingBlockKey: 'BLOCK_KEY',
    conditions: '( HAS_DEV_DELIVERABLE && SCREENS_COUNT_SMALL && CA_NEEDED)',
    price: 6500.50,
    quantity: 10,
    minTime: 35,
    maxTime: 35,
    metadata: {
      deliverable: 'dev-qa',
    },
    createdBy: 1,
    updatedBy: 1,
  };

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => {
        // Create projects
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
        })
          .then((project) => {
            projectId = project.id;

            models.ProjectSetting.bulkCreate([{
              projectId,
              key: 'markup_topcoder_service',
              value: '5599.96',
              valueType: 'double',
              readPermission: {
                projectRoles: ['customer'],
                topcoderRoles: ['administrator'],
              },
              writePermission: {
                allowRule: {
                  projectRoles: ['customer', 'copilot'],
                  topcoderRoles: ['administrator'],
                },
                denyRule: {
                  projectRoles: ['copilot'],
                },
              },
              createdBy: 1,
              updatedBy: 1,
            }, {
              projectId,
              key: 'markup_no_estimation',
              value: '40',
              valueType: 'percentage',
              readPermission: {
                topcoderRoles: ['administrator'],
              },
              writePermission: {
                allowRule: { topcoderRoles: ['administrator'] },
                denyRule: { projectRoles: ['copilot'] },
              },
              createdBy: 1,
              updatedBy: 1,
            }], { returning: true })
              .then((settings) => {
                id = settings[0].id;
                id2 = settings[1].id;
                models.ProjectEstimation.create(_.assign(estimation, { projectId }))
                  .then((e) => {
                    estimationId = e.id;
                    done();
                  });
              });
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('DELETE /projects/{projectId}/settings/{id}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/settings/${id}`)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/settings/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/settings/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed project', (done) => {
      request(server)
        .delete(`/v5/projects/9999/settings/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for non-existed project setting', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/settings/1234`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted project setting', (done) => {
      models.ProjectSetting.destroy({ where: { id } })
        .then(() => {
          request(server)
            .delete(`/v5/projects/${projectId}/settings/${id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        }).catch(done);
    });

    it('should return 204, for admin, if project setting was successfully removed', (done) => {
      models.ProjectEstimationItem.create({
        projectEstimationId: estimationId,
        price: 1200,
        type: 'topcoder_service',
        markupUsedReference: 'projectSetting',
        markupUsedReferenceId: id,
        createdBy: 1,
        updatedBy: 1,
      })
        .then(() => {
          request(server)
            .delete(`/v5/projects/${projectId}/settings/${id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(204)
            .end(err => expectAfterDelete(id, projectId, 0, 1, err, done));
        }).catch(done);
    });

    it('should return 204, for admin, if project setting with non-estimation type was successfully removed',
      (done) => {
        request(server)
          .delete(`/v5/projects/${projectId}/settings/${id2}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .expect(204)
          .end(err => expectAfterDelete(id2, projectId, 0, 0, err, done));
      });

    it('should return 204, for admin, another project setting exists if the project setting was successfully removed',
      (done) => {
        models.ProjectSetting.create({
          projectId,
          key: 'markup_fee',
          value: '25',
          valueType: 'percentage',
          readPermission: {
            projectRoles: ['customer'],
            topcoderRoles: ['administrator'],
          },
          writePermission: {
            allowRule: {
              projectRoles: ['customer', 'copilot'],
              topcoderRoles: ['administrator'],
            },
            denyRule: {
              projectRoles: ['copilot'],
            },
          },
          createdBy: 1,
          updatedBy: 1,
        }).then((anotherSetting) => {
          models.ProjectEstimationItem.create({
            projectEstimationId: estimationId,
            price: 1200,
            type: 'fee',
            markupUsedReference: 'projectSetting',
            markupUsedReferenceId: anotherSetting.id,
            createdBy: 1,
            updatedBy: 1,
          }).then(() => {
            request(server)
              .delete(`/v5/projects/${projectId}/settings/${id}`)
              .set({
                Authorization: `Bearer ${testUtil.jwts.admin}`,
              })
              .expect(204)
              .end(err => expectAfterDelete(id, projectId, 1, 1, err, done));
          });
        }).catch(done);
      });
  });
});
