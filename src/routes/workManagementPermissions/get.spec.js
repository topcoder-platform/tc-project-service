/**
 * Tests for get.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('GET work management permission', () => {
  let permissionId;

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
            permission = _.assign({}, permission, { projectTemplateId: t.id });
            models.WorkManagementPermission.create(permission)
              .then((p) => {
                permissionId = p.id;
              })
              .then(() => done());
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/metadata/workManagementPermission/{permissionId}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get(`/v5/projects/metadata/workManagementPermission/${permissionId}`)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .get(`/v5/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .get(`/v5/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .get(`/v5/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 403 for non-member', (done) => {
      request(server)
        .get(`/v5/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed permission', (done) => {
      request(server)
        .get('/v5/projects/metadata/workManagementPermission/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted permission', (done) => {
      models.WorkManagementPermission.destroy({ where: { id: permissionId } })
        .then(() => {
          request(server)
            .get(`/v5/projects/metadata/workManagementPermission/${permissionId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get(`/v5/projects/metadata/workManagementPermission/${permissionId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.id.should.be.eql(permissionId);
          resJson.policy.should.be.eql(permission.policy);
          resJson.permission.should.be.eql(permission.permission);
          resJson.projectTemplateId.should.be.eql(permission.projectTemplateId);
          resJson.createdBy.should.be.eql(permission.createdBy);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(permission.updatedBy);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });
  });
});
