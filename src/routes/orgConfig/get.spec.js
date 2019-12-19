/**
 * Tests for get.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('GET organization config', () => {
  const config = {
    id: 1,
    orgId: 'ORG1',
    configName: 'project_category_url',
    configValue: '/projects/1',
    createdBy: 1,
    updatedBy: 1,
  };

  const id = config.id;

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.OrgConfig.create(config).then(() => done()));
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /orgConfig/{id}', () => {
    it('should return 404 for non-existed config', (done) => {
      request(server)
        .get('/v5/projects/metadata/orgConfig/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted config', (done) => {
      models.OrgConfig.destroy({ where: { id } })
        .then(() => {
          request(server)
            .get(`/v5/projects/metadata/orgConfig/${id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get(`/v5/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.id.should.be.eql(config.id);
          resJson.orgId.should.be.eql(config.orgId);
          resJson.configName.should.be.eql(config.configName);
          resJson.configValue.should.be.eql(config.configValue);
          resJson.createdBy.should.be.eql(config.createdBy);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(config.updatedBy);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get(`/v5/projects/metadata/orgConfig/${id}`)
        .expect(403, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get(`/v5/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get(`/v5/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get(`/v5/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get(`/v5/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });
  });
});
