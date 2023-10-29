/**
 * Tests for list.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import esUtils from '../../utils/es';

const should = chai.should();

const validateOrgConfig = (resJson, orgConfig) => {
  resJson.id.should.be.eql(orgConfig.id);
  resJson.orgId.should.be.eql(orgConfig.orgId);
  resJson.configName.should.be.eql(orgConfig.configName);
  resJson.configValue.should.be.eql(orgConfig.configValue);
  should.exist(resJson.createdAt);
  resJson.updatedBy.should.be.eql(orgConfig.updatedBy);
  should.exist(resJson.updatedAt);
  should.not.exist(resJson.deletedBy);
  should.not.exist(resJson.deletedAt);
};

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
    orgId: 'ORG2',
    configName: 'project_catalog_url',
    configValue: '/projects/2',
    createdBy: 1,
    updatedBy: 1,
  },
  {
    id: 3,
    orgId: 'ORG3',
    configName: 'project_catalog_url',
    configValue: '/projects/3',
    createdBy: 1,
    updatedBy: 1,
  },
  {
    id: 4,
    orgId: 'ORG4',
    configName: 'project_catalog_url',
    configValue: '/projects/4',
    createdBy: 1,
    updatedBy: 1,
  },
];

describe('LIST organization config', () => {
  after((done) => {
    // clear data after tests in DB and ES
    testUtil.clearDb()
      .then(() => testUtil.clearES())
      .then(done);
  });

  describe('GET /orgConfig', () => {
    describe('permissions', () => {
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
          .expect(200, done);
      });

      it('should return 200 for connect manager with filter', (done) => {
        request(server)
          .get(`${orgConfigPath}?orgId=${configs[0].orgId}&configName=${configs[0].configName}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.manager}`,
          })
          .expect(200, done);
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

    // we are testing all the endpoints with the same data when it comes from DB and ES
    ['ES', 'DB'].forEach((dataSource) => {
      describe(`data from ${dataSource}`, () => {
        before((done) => {
          // clear data in DB and ES before tests
          testUtil.clearDb()
            .then(() => testUtil.clearES())
            // create data in DB first
            .then(() => models.OrgConfig.bulkCreate(configs))
            .then(() => {
              // if we want to test data in ES, then we index data from DB to ES
              // and clear data in DB after that, so we only have data in ES
              if (dataSource === 'ES') {
                return esUtils.indexMetadata()
                  .then(() => testUtil.clearDb());
              }
              return Promise.resolve();
            })
            .then(() => done());
        });

        it(`should get one record for admin with filter (${dataSource})`, (done) => {
          request(server)
            .get(`${orgConfigPath}?orgId=${configs[0].orgId}&configName=${configs[0].configName}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const config1 = configs[0];

              const resJson = res.body;
              resJson.should.have.length(1);
              validateOrgConfig(resJson[0], config1);

              return done();
            });
        });

        it(`should return 2 records for admin with filter by multiple orgId (${dataSource})`, (done) => {
          request(server)
            .get(`${orgConfigPath}?orgId=${configs[0].orgId},${configs[1].orgId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(200)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const config1 = configs[0];
              const config2 = configs[1];

              const resJson = res.body;
              resJson.should.have.length(2);
              resJson.forEach((result) => {
                if (result.id === 1) {
                  validateOrgConfig(result, config1);
                } else {
                  validateOrgConfig(result, config2);
                }
              });

              return done();
            });
        });
      });
    });
  });
});
