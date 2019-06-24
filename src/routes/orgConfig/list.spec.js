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
  const orgConfigPath = '/v5/projects/metadata/orgConfig';
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

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.OrgConfig.bulkCreate(configs).then(() => done()));
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /orgConfig', () => {
    it('should return 200 for admin with filter', (done) => {
      request(server)
        .get(`${orgConfigPath}?orgId=${configs[0].orgId}&configName=${configs[0].configName}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const config = configs[0];

          const resJson = res.body;
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

    it('should return 403 if user is not authenticated with filter', (done) => {
      request(server)
        .get(`${orgConfigPath}?orgId=${configs[0].orgId}&configName=${configs[0].configName}`)
        .expect(403, done);
    });

    it('should return 200 for connect admin with filter', (done) => {
      request(server)
        .get(`${orgConfigPath}?orgId=${configs[0].orgId}&configName=${configs[0].configName}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager with filter', (done) => {
      request(server)
        .get(`${orgConfigPath}?orgId=${configs[0].orgId}&configName=${configs[0].configName}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member with filter', (done) => {
      request(server)
        .get(`${orgConfigPath}?orgId=${configs[0].orgId}&configName=${configs[0].configName}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot with filter', (done) => {
      request(server)
        .get(`${orgConfigPath}?orgId=${configs[0].orgId}&configName=${configs[0].configName}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });

    it('should return 400 without filter query param', (done) => {
      request(server)
        .get(`${orgConfigPath}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(400, done);
    });

    it('should return 400 with filter query param but without orgId defined', (done) => {
      request(server)
        .get(`${orgConfigPath}?filter=configName=${configs[0].configName}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(400, done);
    });
  });
});
