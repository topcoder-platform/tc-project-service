/**
 * Tests for get.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('UPDATE project type', () => {
  const type = {
    key: 'key1',
    displayName: 'displayName 1',
    createdBy: 1,
    updatedBy: 1,
  };
  const key = type.key;

  beforeEach(() => testUtil.clearDb()
    .then(() => models.ProjectType.create(type))
    .then(() => Promise.resolve()),
  );
  after(testUtil.clearDb);

  describe('PATCH /projectTypes/{key}', () => {
    const body = {
      param: {
        displayName: 'displayName 1 - update',
      },
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch(`/v4/projectTypes/${key}`)
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .patch(`/v4/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .patch(`/v4/projectTypes/${key}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .patch(`/v4/projectTypes/${key}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 422 for missing displayName', (done) => {
      const invalidBody = {
        param: {
          displayName: null,
        },
      };

      request(server)
        .patch(`/v4/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect(422, done);
    });

    it('should return 404 for non-existed type', (done) => {
      request(server)
        .patch('/v4/projectTypes/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 404 for deleted type', (done) => {
      models.ProjectType.destroy({ where: { key } })
        .then(() => {
          request(server)
            .patch(`/v4/projectTypes/${key}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(body)
            .expect(404, done);
        });
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .patch(`/v4/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(body.param.displayName);
          resJson.createdBy.should.be.eql(type.createdBy);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .patch(`/v4/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });
  });
});
