/**
 * Tests for update.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';

import server from '../../app';
import testUtil from '../../tests/util';
import models from '../../models';
import { VALUE_TYPE } from '../../constants';

const should = chai.should();

const expectAfterUpdate = (id, projectId, estimation, len, deletedLen, err, next) => {
  if (err) throw err;

  models.ProjectSetting.findOne({
    includeAllProjectSettingsForInternalUsage: true,
    where: {
      id,
      projectId,
    },
  })
    .then((res) => {
      if (!res) {
        throw new Error('Should found the entity');
      } else {
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
        }).then((entities) => {
          entities.should.have.lengthOf(len, 'Number of created ProjectEstimationItems doesn\'t match');
          if (len) {
            entities[0].projectEstimationId.should.be.eql(estimation.id);
            if (estimation.valueType === VALUE_TYPE.PERCENTAGE) {
              entities[0].price.should.be.eql((estimation.price * estimation.value) / 100);
            } else {
              entities[0].price.should.be.eql(Number(estimation.value));
            }
            entities[0].type.should.be.eql(estimation.key.split('markup_')[1]);
            entities[0].markupUsedReference.should.be.eql('projectSetting');
            entities[0].markupUsedReferenceId.should.be.eql(id);
            should.exist(entities[0].updatedAt);
            should.not.exist(entities[0].deletedBy);
            should.not.exist(entities[0].deletedAt);
          }

          next();
        });
      }
    });
};

describe('UPDATE Project Setting', () => {
  let projectId;
  let estimationId;
  let id;

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

  const body = {
    value: '5599.96',
    valueType: 'double',
    readPermission: {
      projectRoles: ['customer'],
      topcoderRoles: ['administrator'],
    },
    writePermission: {
      allowRule: {
        projectRoles: ['customer', 'copilot'],
        topcoderRoles: ['administrator', 'Connect Admin'],
      },
      denyRule: {
        projectRoles: ['copilot'],
        topcoderRoles: ['Connect Admin'],
      },
    },
  };

  // we don't include these params into the body, we cannot update them
  // but we use them for creating model directly and for checking returned values
  const bodyNonMutable = {
    key: 'markup_topcoder_service',
    createdBy: 1,
    updatedBy: 1,
  };

  const estimation = {
    buildingBlockKey: 'BLOCK_KEY',
    conditions: '( HAS_DEV_DELIVERABLE && ONLY_ONE_OS_MOBILE && CA_NEEDED )',
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

            models.ProjectMember.bulkCreate([{
              id: 1,
              userId: copilotUser.userId,
              projectId,
              role: 'copilot',
              isPrimary: false,
              createdBy: 1,
              updatedBy: 1,
            }, {
              id: 2,
              userId: memberUser.userId,
              projectId,
              role: 'customer',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1,
            }])
              .then(() => {
                models.ProjectSetting.create(_.assign({}, body, bodyNonMutable, {
                  projectId,
                }))
                  .then((s) => {
                    id = s.id;

                    models.ProjectEstimation.create(_.assign(estimation, { projectId }))
                      .then((e) => {
                        estimationId = e.id;
                        done();
                      });
                  }).catch(done);
              });
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('PATCH /projects/{projectId}/settings/{id}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/settings/${id}`)
        .send(body)
        .expect(403, done);
    });

    it('should return 403 when user have no permission (non team member)', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/settings/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 when copilot is in both denyRule and allowRule', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/settings/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 when connect admin is in both denyRule and allowRule', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/settings/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 404 for non-existed project', (done) => {
      request(server)
        .patch(`/v5/projects/9999/settings/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 404 for non-existed project setting', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/settings/1234`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 404 for deleted project setting', (done) => {
      models.ProjectSetting.destroy({ where: { id } })
        .then(() => {
          request(server)
            .patch(`/v5/projects/${projectId}/settings/${id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(body)
            .expect(404, done);
        });
    });

    it('should return 400, when try to update key', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/settings/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({
          key: 'updated_key',
        })
        .expect(400, done);
    });

    it('should return 200, for member with permission (team member), value updated but no project estimation present',
      (done) => {
        const notPresent = _.cloneDeep(body);
        notPresent.value = '4500';

        models.ProjectEstimation.destroy({
          where: {
            id: estimationId,
          },
        }).then(() => {
          models.ProjectEstimationItem.destroy({
            where: {
              markupUsedReference: 'projectSetting',
              markupUsedReferenceId: id,
            },
          }).then(() => {
            request(server)
              .patch(`/v5/projects/${projectId}/settings/${id}`)
              .set({
                Authorization: `Bearer ${testUtil.jwts.member}`,
              })
              .send({
                value: notPresent.value,
              })
              .expect('Content-Type', /json/)
              .expect(200)
              .end((err, res) => {
                if (err) done(err);

                const resJson = res.body;
                resJson.id.should.be.eql(id);
                resJson.key.should.be.eql(bodyNonMutable.key);
                resJson.value.should.be.eql(notPresent.value);
                resJson.valueType.should.be.eql(notPresent.valueType);
                resJson.projectId.should.be.eql(projectId);
                resJson.createdBy.should.be.eql(bodyNonMutable.createdBy);
                resJson.updatedBy.should.be.eql(40051331);
                should.exist(resJson.updatedAt);
                should.not.exist(resJson.deletedBy);
                should.not.exist(resJson.deletedAt);
                expectAfterUpdate(id, projectId, _.assign(estimation, {
                  id: estimationId,
                  value: notPresent.value,
                  valueType: notPresent.valueType,
                  key: bodyNonMutable.key,
                }), 0, 0, err, done);
              });
          });
        }).catch(done);
      });

    it('should return 200 for admin when value updated, calculating project estimation items', (done) => {
      body.value = '4500';

      models.ProjectEstimationItem.create({
        projectEstimationId: estimationId,
        price: 1200,
        type: 'topcoder_service',
        markupUsedReference: 'projectSetting',
        markupUsedReferenceId: id,
        createdBy: 1,
        updatedBy: 1,
      }).then(() => {
        request(server)
          .patch(`/v5/projects/${projectId}/settings/${id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            value: body.value,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) done(err);

            const resJson = res.body;
            resJson.id.should.be.eql(id);
            resJson.key.should.be.eql(bodyNonMutable.key);
            resJson.value.should.be.eql(body.value);
            resJson.valueType.should.be.eql(body.valueType);
            resJson.projectId.should.be.eql(projectId);
            resJson.createdBy.should.be.eql(bodyNonMutable.createdBy);
            resJson.updatedBy.should.be.eql(40051333); // admin
            should.exist(resJson.updatedAt);
            should.not.exist(resJson.deletedBy);
            should.not.exist(resJson.deletedAt);
            expectAfterUpdate(id, projectId, _.assign(estimation, {
              id: estimationId,
              value: body.value,
              valueType: body.valueType,
              key: bodyNonMutable.key,
            }), 1, 1, err, done);
          });
      }).catch(done);
    });

    it('should return 200, for admin, update valueType from double to percentage', (done) => {
      body.value = '10.76';
      body.valueType = VALUE_TYPE.PERCENTAGE;
      request(server)
        .patch(`/v5/projects/${projectId}/settings/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({
          value: body.value,
          valueType: VALUE_TYPE.PERCENTAGE,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) done(err);

          const resJson = res.body;
          resJson.id.should.be.eql(id);
          resJson.key.should.be.eql(bodyNonMutable.key);
          resJson.value.should.be.eql(body.value);
          resJson.valueType.should.be.eql(VALUE_TYPE.PERCENTAGE);
          resJson.projectId.should.be.eql(projectId);
          resJson.createdBy.should.be.eql(bodyNonMutable.createdBy);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);
          expectAfterUpdate(id, projectId, _.assign(estimation, {
            id: estimationId,
            value: body.value,
            valueType: body.valueType,
            key: bodyNonMutable.key,
          }), 1, 0, err, done);
        });
    });
  });
});
