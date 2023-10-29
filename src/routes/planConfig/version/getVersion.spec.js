/**
 * Tests for getVersion.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../../models';
import server from '../../../app';
import testUtil from '../../../tests/util';

const should = chai.should();

describe('GET a particular version of specific key of PlanConfig', () => {
  const planConfigs = [
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
      version: 2,
      revision: 1,
      createdBy: 1,
      updatedBy: 1,
    },
    {
      key: 'dev',
      config: {
        test: 'test3',
      },
      version: 2,
      revision: 2,
      createdBy: 1,
      updatedBy: 1,
    },
  ];

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.PlanConfig.create(planConfigs[0]))
      .then(() => models.PlanConfig.create(planConfigs[1]))
      .then(() => models.PlanConfig.create(planConfigs[2]).then(() => done()));
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/metadata/planConfig/dev/versions/{version}', () => {
    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v5/projects/metadata/planConfig/dev/versions/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const planConfig = planConfigs[0];
          const resJson = res.body;

          resJson.key.should.be.eql(planConfig.key);
          resJson.config.should.be.eql(planConfig.config);
          resJson.version.should.be.eql(planConfig.version);
          resJson.revision.should.be.eql(planConfig.revision);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(planConfig.updatedBy);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);
          done();
        });
    });

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v5/projects/metadata/planConfig/dev/versions/1')
        .expect(403, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get('/v5/projects/metadata/planConfig/dev')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get('/v5/projects/metadata/planConfig/dev/versions/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get('/v5/projects/metadata/planConfig/dev/versions/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get('/v5/projects/metadata/planConfig/dev/versions/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });
  });
});
