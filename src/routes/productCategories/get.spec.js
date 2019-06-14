/**
 * Tests for get.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('GET product category', () => {
  const productCategory = {
    key: 'key1',
    displayName: 'displayName 1',
    icon: 'http://example.com/icon1.ico',
    question: 'question 1',
    info: 'info 1',
    aliases: ['key-1', 'key_1'],
    disabled: true,
    hidden: true,
    createdBy: 1,
    updatedBy: 1,
  };

  const key = productCategory.key;

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.ProductCategory.create(productCategory).then(() => done()));
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/metadata/productCategories/{key}', () => {
    it('should return 404 for non-existed product category', (done) => {
      request(server)
        .get('/v5/projects/metadata/productCategories/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted product category', (done) => {
      models.ProductCategory.destroy({ where: { key } })
        .then(() => {
          request(server)
            .get(`/v5/projects/metadata/productCategories/${key}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get(`/v5/projects/metadata/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.key.should.be.eql(productCategory.key);
          resJson.displayName.should.be.eql(productCategory.displayName);
          resJson.icon.should.be.eql(productCategory.icon);
          resJson.info.should.be.eql(productCategory.info);
          resJson.question.should.be.eql(productCategory.question);
          resJson.aliases.should.be.eql(productCategory.aliases);
          resJson.disabled.should.be.eql(productCategory.disabled);
          resJson.hidden.should.be.eql(productCategory.hidden);
          resJson.createdBy.should.be.eql(productCategory.createdBy);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(productCategory.updatedBy);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get(`/v5/projects/metadata/productCategories/${key}`)
        .expect(403, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get(`/v5/projects/metadata/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get(`/v5/projects/metadata/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get(`/v5/projects/metadata/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get(`/v5/projects/metadata/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });
  });
});
