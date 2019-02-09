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

describe('UPDATE organization config', () => {
  const config = {
    id: 1,
    orgId: 'ORG1',
    configName: 'project_category_url',
    configValue: '/projects/1',
    createdBy: 1,
    updatedBy: 1,
  };
  const id = config.id;

  beforeEach(() => testUtil.clearDb()
    .then(() => models.OrgConfig.create(config))
    .then(() => Promise.resolve()),
  );
  after(testUtil.clearDb);

  describe('PATCH /orgConfig/{id}', () => {
    const body = {
      param: {
        id: 1,
        orgId: 'ORG2',
        configName: 'project_category_url_update',
        configValue: '/projects/2',
      },
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch(`/v4/projects/metadata/orgConfig/${id}`)
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .patch(`/v4/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .patch(`/v4/projects/metadata/orgConfig/${id}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .patch(`/v4/projects/metadata/orgConfig/${id}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed config', (done) => {
      request(server)
        .patch('/v4/projects/metadata/orgConfig/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 404 for deleted config', (done) => {
      models.OrgConfig.destroy({ where: { id } })
        .then(() => {
          request(server)
            .patch(`/v4/projects/metadata/orgConfig/${id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(body)
            .expect(404, done);
        });
    });

    it('should return 200 for admin configValue updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.orgId;
      delete partialBody.param.configName;
      request(server)
        .patch(`/v4/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.id.should.be.eql(id);
          resJson.orgId.should.be.eql(config.orgId);
          resJson.configName.should.be.eql(config.configName);
          resJson.configValue.should.be.eql(partialBody.param.configValue);
          resJson.createdBy.should.be.eql(config.createdBy);
          resJson.createdBy.should.be.eql(config.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin orgId updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.configName;
      delete partialBody.param.configValue;
      request(server)
        .patch(`/v4/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.id.should.be.eql(id);
          resJson.orgId.should.be.eql(partialBody.param.orgId);
          resJson.configName.should.be.eql(config.configName);
          resJson.configValue.should.be.eql(config.configValue);
          resJson.createdBy.should.be.eql(config.createdBy);
          resJson.createdBy.should.be.eql(config.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin configName updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.orgId;
      delete partialBody.param.configValue;
      request(server)
        .patch(`/v4/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.id.should.be.eql(id);
          resJson.orgId.should.be.eql(config.orgId);
          resJson.configName.should.be.eql(partialBody.param.configName);
          resJson.configValue.should.be.eql(config.configValue);
          resJson.createdBy.should.be.eql(config.createdBy);
          resJson.createdBy.should.be.eql(config.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin all fields updated', (done) => {
      request(server)
        .patch(`/v4/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.id.should.be.eql(id);
          resJson.orgId.should.be.eql(body.param.orgId);
          resJson.configName.should.be.eql(body.param.configName);
          resJson.configValue.should.be.eql(body.param.configValue);
          resJson.createdBy.should.be.eql(config.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .patch(`/v4/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.id.should.be.eql(id);
          resJson.orgId.should.be.eql(body.param.orgId);
          resJson.configName.should.be.eql(body.param.configName);
          resJson.configValue.should.be.eql(body.param.configValue);
          resJson.createdBy.should.be.eql(config.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051336); // connect admin
          done();
        });
    });
  });
});
