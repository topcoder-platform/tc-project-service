/**
 * Tests for create.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';

import server from '../../app';
import testUtil from '../../tests/util';
import models from '../../models';
import { VALUE_TYPE } from '../../constants';

const should = chai.should();

const expectAfterCreate = (id, projectId, estimation, len, deletedLen, err, next) => {
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
        }).catch(next);
      }
    });
};

describe('CREATE Project Setting', () => {
  let projectId;
  let estimationId;

  const body = {
    key: 'markup_topcoder_service',
    value: '3500',
    valueType: 'double',
    readPermission: {
      projectRoles: ['customer'],
      topcoderRoles: ['administrator'],
    },
    writePermission: {
      allowRule: { topcoderRoles: ['administrator'] },
      denyRule: { projectRoles: ['copilot'] },
    },
  };

  const estimation = {
    buildingBlockKey: 'BLOCK_KEY',
    conditions: '( HAS_DEV_DELIVERABLE && ONLY_ONE_OS_MOBILE && CA_NEEDED )',
    price: 5000,
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

            models.ProjectEstimation.create(_.assign(estimation, { projectId }))
              .then((e) => {
                estimationId = e.id;
                done();
              });
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects/{projectId}/settings', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/settings`)
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/settings`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/settings`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 404 for non-existed project', (done) => {
      request(server)
        .post('/v5/projects/9999/settings')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 400 for missing key', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.key;

      request(server)
        .post(`/v5/projects/${projectId}/settings`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 for missing value', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.value;

      request(server)
        .post(`/v5/projects/${projectId}/settings`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 for missing valueType', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.valueType;

      request(server)
        .post(`/v5/projects/${projectId}/settings`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    xit('should return 400 for negative value when valueType = percentage', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.value = '-10';
      invalidBody.valueType = VALUE_TYPE.PERCENTAGE;

      request(server)
        .post(`/v5/projects/${projectId}/settings`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    xit('should return 400 for value greater than 100 when valueType = percentage', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.value = '150';
      invalidBody.valueType = VALUE_TYPE.PERCENTAGE;

      request(server)
        .post(`/v5/projects/${projectId}/settings`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400, for admin, when create key with existing key', (done) => {
      const existing = _.cloneDeep(body);
      existing.projectId = projectId;
      existing.createdBy = 1;
      existing.updatedBy = 1;

      models.ProjectSetting.create(existing).then(() => {
        request(server)
          .post(`/v5/projects/${projectId}/settings`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send(body)
          .expect(400, done);
      }).catch(done);
    });

    it('should return 201 for manager with non-estimation type, not calculating project estimation items',
      (done) => {
        const createBody = _.cloneDeep(body);
        createBody.key = 'markup_no_estimation';

        request(server)
          .post(`/v5/projects/${projectId}/settings`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.manager}`,
          })
          .send(createBody)
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) done(err);

            const resJson = res.body;
            resJson.key.should.be.eql(createBody.key);
            resJson.value.should.be.eql(createBody.value);
            resJson.valueType.should.be.eql(createBody.valueType);
            resJson.projectId.should.be.eql(projectId);
            resJson.createdBy.should.be.eql(40051334);
            should.exist(resJson.createdAt);
            resJson.updatedBy.should.be.eql(40051334);
            should.exist(resJson.updatedAt);
            should.not.exist(resJson.deletedBy);
            should.not.exist(resJson.deletedAt);
            expectAfterCreate(resJson.id, projectId, null, 0, 0, err, done);
          });
      });

    it('should return 201 for manager, calculating project estimation items', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/settings`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) done(err);

          const resJson = res.body;
          resJson.key.should.be.eql(body.key);
          resJson.value.should.be.eql(body.value);
          resJson.valueType.should.be.eql(body.valueType);
          resJson.projectId.should.be.eql(projectId);
          resJson.createdBy.should.be.eql(40051334);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051334);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);
          expectAfterCreate(resJson.id, projectId, _.assign(estimation, {
            id: estimationId,
            value: body.value,
            valueType: body.valueType,
            key: body.key,
          }), 1, 0, err, done);
        });
    });

    it('should return 201 for admin', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/settings`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) done(err);

          const resJson = res.body;
          resJson.key.should.be.eql(body.key);
          resJson.value.should.be.eql(body.value);
          resJson.valueType.should.be.eql(body.valueType);
          resJson.projectId.should.be.eql(projectId);
          resJson.createdBy.should.be.eql(40051333);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);
          done();
        });
    });

    it('should return 201 for connect admin', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/settings`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) done(err);

          const resJson = res.body;
          resJson.key.should.be.eql(body.key);
          resJson.value.should.be.eql(body.value);
          resJson.valueType.should.be.eql(body.valueType);
          resJson.projectId.should.be.eql(projectId);
          resJson.createdBy.should.be.eql(40051336);
          resJson.updatedBy.should.be.eql(40051336);
          should.exist(resJson.createdAt);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);
          done();
        });
    });
  });
});
