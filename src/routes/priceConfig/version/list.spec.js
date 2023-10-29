/* eslint-disable quote-props */
/**
 * Tests for list.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../../models';
import server from '../../../app';
import testUtil from '../../../tests/util';

const should = chai.should();

describe('LIST priceConfig versions', () => {
  const priceConfigs = [
    {
      key: 'dev',
      config: {
        'test': 'test1',
      },
      version: 1,
      revision: 1,
      createdBy: 1,
      updatedBy: 1,
    },
    {
      key: 'dev',
      config: {
        test: 'test2',
      },
      version: 2,
      revision: 1,
      createdBy: 1,
      updatedBy: 1,
    },
  ];

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.PriceConfig.create(priceConfigs[0]))
      .then(() => models.PriceConfig.create(priceConfigs[1]).then(() => done()));
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/metadata/priceConfig/dev/versions/{version}', () => {
    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v5/projects/metadata/priceConfig/dev/versions')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const priceConfig = priceConfigs[0];
          const resJson = res.body;
          resJson.should.have.length(2);

          resJson[0].key.should.be.eql(priceConfig.key);
          resJson[0].config.should.be.eql(priceConfig.config);
          resJson[0].version.should.be.eql(priceConfig.version);
          resJson[0].revision.should.be.eql(priceConfig.revision);
          should.exist(resJson[0].createdAt);
          resJson[0].updatedBy.should.be.eql(priceConfig.updatedBy);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);
          done();
        });
    });

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v5/projects/metadata/priceConfig/dev/versions')
        .expect(403, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get('/v5/projects/metadata/priceConfig/dev/versions')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get('/v5/projects/metadata/priceConfig/dev/versions')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get('/v5/projects/metadata/priceConfig/dev/versions')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get('/v5/projects/metadata/priceConfig/dev/versions')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });
  });
});
