/**
 * Tests for create.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';

import server from '../../app';
import testUtil from '../../tests/util';
import models from '../../models';

const should = chai.should();

describe('CREATE work management permission', () => {
  let templateId;

  const body = {
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
          key: 'key 2',
          category: 'category 2',
          icon: 'http://example.com/icon1.ico',
          question: 'question 2',
          info: 'info 2',
          aliases: ['key-2', 'key_2'],
          scope: {},
          phases: {},
          createdBy: 1,
          updatedBy: 2,
        })
          .then((t) => {
            templateId = t.id;
            body.projectTemplateId = templateId;
          }).then(() => done());
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects/metadata/workManagementPermission', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .post('/v5/projects/metadata/workManagementPermission')
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .post('/v5/projects/metadata/workManagementPermission')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .post('/v5/projects/metadata/workManagementPermission')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .post('/v5/projects/metadata/workManagementPermission')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for non-member', (done) => {
      request(server)
        .post('/v5/projects/metadata/workManagementPermission')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 400 for missing policy', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.policy;

      request(server)
        .post('/v5/projects/metadata/workManagementPermission')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 for missing permission', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.permission;

      request(server)
        .post('/v5/projects/metadata/workManagementPermission')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 for missing projectTemplateId', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.projectTemplateId;

      request(server)
        .post('/v5/projects/metadata/workManagementPermission')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 for duplicated policy and projectTemplateId', (done) => {
      models.WorkManagementPermission.create(body)
        .then(() => {
          request(server)
            .post('/v5/projects/metadata/workManagementPermission')
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(body)
            .expect('Content-Type', /json/)
            .expect(400, done);
        });
    });

    it('should return 400 for deleted but duplicated policy and projectTemplateId', (done) => {
      models.WorkManagementPermission.create(body)
        .then((permission) => {
          models.WorkManagementPermission.destroy({ where: { id: permission.id } });
        })
        .then(() => {
          request(server)
            .post('/v5/projects/metadata/workManagementPermission')
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(body)
            .expect('Content-Type', /json/)
            .expect(400, done);
        });
    });

    it('should return 201 for admin', (done) => {
      request(server)
        .post('/v5/projects/metadata/workManagementPermission')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          resJson.policy.should.be.eql(body.policy);
          resJson.permission.should.be.eql(body.permission);
          resJson.projectTemplateId.should.be.eql(body.projectTemplateId);
          resJson.createdBy.should.be.eql(40051333); // admin
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });
  });
});
