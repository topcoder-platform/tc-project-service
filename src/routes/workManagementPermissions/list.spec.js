/* eslint-disable max-len */
/**
 * Tests for list.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('LIST work management permissions', () => {
  let templateIds;

  const templates = [
    {
      name: 'template 1',
      key: 'key 1',
      category: 'category 1',
      icon: 'http://example.com/icon1.ico',
      question: 'question 1',
      info: 'info 1',
      aliases: ['key-1', 'key_1'],
      disabled: true,
      hidden: true,
      scope: {
        scope1: {
          subScope1A: 1,
          subScope1B: 2,
        },
        scope2: [1, 2, 3],
      },
      phases: {
        phase1: {
          name: 'phase 1',
          details: {
            anyDetails: 'any details 1',
          },
          others: ['others 11', 'others 12'],
        },
        phase2: {
          name: 'phase 2',
          details: {
            anyDetails: 'any details 2',
          },
          others: ['others 21', 'others 22'],
        },
      },
      createdBy: 1,
      updatedBy: 1,
    },
    {
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
    },
  ];
  const permissions = [
    {
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
    },
    {
      policy: 'work.edit',
      permission: {
        allowRule: {
          projectRoles: ['customer', 'copilot'],
          topcoderRoles: ['Connect Manager', 'Connect Admin', 'administrator'],
        },
        denyRule: { projectRoles: ['copilot'] },
      },
      createdBy: 1,
      updatedBy: 1,
    },
  ];
  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => {
        models.ProjectTemplate.bulkCreate(templates, { returning: true })
          .then((t) => {
            templateIds = _.map(t, template => template.id);
            const newPermissions = _.map(permissions, p => _.assign({}, p, { projectTemplateId: templateIds[0] }));
            newPermissions.push(_.assign({}, permissions[0], { projectTemplateId: templateIds[1] }));
            models.WorkManagementPermission.bulkCreate(newPermissions, { returning: true })
              .then(() => done());
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/metadata/workManagementPermission', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v5/projects/metadata/workManagementPermission?filter=projectTemplateId%3D1')
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .get('/v5/projects/metadata/workManagementPermission?filter=projectTemplateId%3D1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .get('/v5/projects/metadata/workManagementPermission?filter=projectTemplateId%3D1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .get('/v5/projects/metadata/workManagementPermission?filter=projectTemplateId%3D1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 403 for non-member', (done) => {
      request(server)
        .get('/v5/projects/metadata/workManagementPermission?filter=projectTemplateId%3D1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect(403, done);
    });

    it('should return 400 for missing filter', (done) => {
      request(server)
        .get('/v5/projects/metadata/workManagementPermission')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 for missing projectTemplateId', (done) => {
      request(server)
        .get('/v5/projects/metadata/workManagementPermission?filter=template')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 for invalid filter', (done) => {
      request(server)
        .get(`/v5/projects/metadata/workManagementPermission?filter=invalid%3D2%26projectTemplateId%3D${templateIds[0]}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(500, done);
    });


    it('should return 200 for admin for projectTemplateId=1', (done) => {
      request(server)
        .get(`/v5/projects/metadata/workManagementPermission?filter=projectTemplateId%3D${templateIds[0]}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(2);
          resJson[0].policy.should.be.eql(permissions[0].policy);
          resJson[0].permission.should.be.eql(permissions[0].permission);
          resJson[0].projectTemplateId.should.be.eql(templateIds[0]);
          should.exist(resJson[0].createdAt);
          resJson[0].updatedBy.should.be.eql(permissions[0].updatedBy);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);
          resJson[1].policy.should.be.eql(permissions[1].policy);
          resJson[1].permission.should.be.eql(permissions[1].permission);
          resJson[1].projectTemplateId.should.be.eql(templateIds[0]);
          should.exist(resJson[1].createdAt);
          resJson[1].updatedBy.should.be.eql(permissions[1].updatedBy);
          should.exist(resJson[1].updatedAt);
          should.not.exist(resJson[1].deletedBy);
          should.not.exist(resJson[1].deletedAt);

          done();
        });
    });

    it('should return 200 for admin for projectTemplateId=2', (done) => {
      request(server)
        .get(`/v5/projects/metadata/workManagementPermission?filter=projectTemplateId%3D${templateIds[1]}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(1);
          resJson[0].policy.should.be.eql(permissions[0].policy);
          resJson[0].permission.should.be.eql(permissions[0].permission);
          resJson[0].projectTemplateId.should.be.eql(templateIds[1]);
          should.exist(resJson[0].createdAt);
          resJson[0].updatedBy.should.be.eql(permissions[0].updatedBy);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);

          done();
        });
    });
  });
});
