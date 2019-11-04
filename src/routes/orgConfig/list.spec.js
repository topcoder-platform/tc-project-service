/**
 * Tests for list.js
 */
import chai from 'chai';
import request from 'supertest';
import config from 'config';
import _ from 'lodash';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

const ES_ORGCONFIG_INDEX = config.get('elasticsearchConfig.metadataIndexName');
const ES_ORGCONFIG_TYPE = config.get('elasticsearchConfig.metadataDocType');

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

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.OrgConfig.bulkCreate(configs, { returning: true }),
        ).then(async (createdConfigs) => {
          // Index to ES only orgConfigs with id: 3 and 4
          const indexedConfigs = _(createdConfigs).filter(createdConfig => createdConfig.toJSON().id > 2)
            .map((filteredConfig) => {
              const orgConfigJson = _.omit(filteredConfig.toJSON(), 'deletedAt', 'deletedBy');
              return orgConfigJson;
            }).value();

          await server.services.es.index({
            index: ES_ORGCONFIG_INDEX,
            type: ES_ORGCONFIG_TYPE,
            body: {
              orgConfigs: indexedConfigs,
            },
          });
          done();
        });
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
          const config1 = configs[0];

          const resJson = res.body;
          resJson.should.have.length(1);
          validateOrgConfig(resJson[0], config1);

          done();
        });
    });

    it('should return 200 for admin with filter (ES)', (done) => {
      request(server)
        .get(`${orgConfigPath}?orgId=${configs[2].orgId}&configName=${configs[2].configName}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const config3 = configs[2];

          const resJson = res.body;
          resJson.should.have.length(1);
          validateOrgConfig(resJson[0], config3);

          done();
        });
    });

    it('should return 200 for admin and filter by multiple orgId (DB)', (done) => {
      request(server)
        .get(`${orgConfigPath}?orgId=${configs[0].orgId},${configs[1].orgId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
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

          done();
        });
    });

    it('should return 200 for admin and filter by multiple orgId (ES)', (done) => {
      request(server)
        .get(`${orgConfigPath}?orgId=${configs[2].orgId},${configs[3].orgId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const config3 = configs[2];
          const config4 = configs[3];

          const resJson = res.body;
          resJson.should.have.length(2);
          resJson.forEach((result) => {
            if (result.id === 3) {
              validateOrgConfig(result, config3);
            } else {
              validateOrgConfig(result, config4);
            }
          });

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
