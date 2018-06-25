/**
 * Tests for list.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('LIST project types', () => {
  const types = [
    {
      key: 'key1',
      displayName: 'displayName 1',
      createdBy: 1,
      updatedBy: 1,
    },
    {
      key: 'key2',
      displayName: 'displayName 1',
      createdBy: 1,
      updatedBy: 1,
    },
  ];

  beforeEach(() => testUtil.clearDb()
    .then(() => models.ProjectType.create(types[0]))
    .then(() => models.ProjectType.create(types[1]))
    .then(() => Promise.resolve()),
  );
  after(testUtil.clearDb);

  describe('GET /projectTypes', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v4/projectTypes')
        .expect(403, done);
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v4/projectTypes')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const type = types[0];

          const resJson = res.body.result.content;
          resJson.should.have.length(2);
          resJson[0].key.should.be.eql(type.key);
          resJson[0].displayName.should.be.eql(type.displayName);
          resJson[0].createdBy.should.be.eql(type.createdBy);
          should.exist(resJson[0].createdAt);
          resJson[0].updatedBy.should.be.eql(type.updatedBy);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);

          done();
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get('/v4/projectTypes')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get('/v4/projectTypes')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get('/v4/projectTypes')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get('/v4/projectTypes')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });
  });
});
