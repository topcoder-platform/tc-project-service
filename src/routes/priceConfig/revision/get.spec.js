/**
 * Tests for get.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../../models';
import server from '../../../app';
import testUtil from '../../../tests/util';

const should = chai.should();

describe('GET a particular revision of specific version PriceConfig', () => {
  const priceConfigs = [
    {
      key: 'dev',
      config: {
        test: 'test1',
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
      version: 1,
      revision: 2,
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

  describe('GET /projects/metadata/priceConfig/dev/versions/{version}/revisions/{revision}', () => {
    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v5/projects/metadata/priceConfig/dev/versions/1/revisions/2')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const priceConfig = priceConfigs[1];
          const resJson = res.body;

          resJson.key.should.be.eql(priceConfig.key);
          resJson.config.should.be.eql(priceConfig.config);
          resJson.version.should.be.eql(priceConfig.version);
          resJson.revision.should.be.eql(priceConfig.revision);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(priceConfig.updatedBy);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);
          done();
        });
    });

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v5/projects/metadata/priceConfig/dev/versions/1/revisions/2')
        .expect(403, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get('/v5/projects/metadata/priceConfig/dev/versions/1/revisions/2')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get('/v5/projects/metadata/priceConfig/dev/versions/1/revisions/2')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get('/v5/projects/metadata/priceConfig/dev/versions/1/revisions/2')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get('/v5/projects/metadata/priceConfig/dev/versions/1/revisions/2')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });
  });
});
