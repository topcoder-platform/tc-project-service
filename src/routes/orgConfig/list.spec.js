/**
 * Tests for list.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('LIST organization config', () => {
  const configs = [
    {
      id: 1,
      orgId: 'ORG1',
      configName: 'project_category_url',
      configValue: '/projects/1',
      createdBy: 1,
      updatedBy: 1,
    },
    {
      id: 2,
      orgId: 'ORG1',
      configName: 'project_catalog_url',
      configValue: '/projects/2',
      createdBy: 1,
      updatedBy: 1,
    },
  ];

  beforeEach(() => testUtil.clearDb()
    .then(() => models.OrgConfig.create(configs[0]))
    .then(() => models.OrgConfig.create(configs[1]))
    .then(() => Promise.resolve()),
  );
  after(testUtil.clearDb);

  describe('GET /orgConfig', () => {
    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v4/projects/metadata/orgConfig')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const config = configs[0];

          const resJson = res.body.result.content;
          resJson.should.have.length(2);
          resJson[0].id.should.be.eql(config.id);
          resJson[0].orgId.should.be.eql(config.orgId);
          resJson[0].configName.should.be.eql(config.configName);
          resJson[0].configValue.should.be.eql(config.configValue);
          should.exist(resJson[0].createdAt);
          resJson[0].updatedBy.should.be.eql(config.updatedBy);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);

          done();
        });
    });

    it('should return 200 with filters', (done) => {
      request(server)
        .get(`/v4/projects/metadata/orgConfig?filter=orgId%3Din%28${configs[0].orgId}%29%26configName=${configs[0].configName}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const config = configs[0];

          const resJson = res.body.result.content;
          resJson.should.have.length(1);
          resJson[0].id.should.be.eql(config.id);
          resJson[0].orgId.should.be.eql(config.orgId);
          resJson[0].configName.should.be.eql(config.configName);
          resJson[0].configValue.should.be.eql(config.configValue);
          should.exist(resJson[0].createdAt);
          resJson[0].updatedBy.should.be.eql(config.updatedBy);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);

          done();
        });
    });

    it('should return 200 even if user is not authenticated', (done) => {
      request(server)
        .get('/v4/projects/metadata/orgConfig')
        .expect(200, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get('/v4/projects/metadata/orgConfig')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get('/v4/projects/metadata/orgConfig')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get('/v4/projects/metadata/orgConfig')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get('/v4/projects/metadata/orgConfig')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });
  });
});
