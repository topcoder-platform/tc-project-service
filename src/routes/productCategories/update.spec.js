/**
 * Tests for get.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('UPDATE product category', () => {
  const productCategory = {
    key: 'key1',
    displayName: 'displayName 1',
    icon: 'http://example.com/icon1.ico',
    question: 'question 1',
    info: 'info 1',
    aliases: ['key-1', 'key_1'],
    disabled: false,
    hidden: false,
    createdBy: 1,
    updatedBy: 1,
  };
  const key = productCategory.key;

  beforeEach(() => testUtil.clearDb()
    .then(() => models.ProductCategory.create(productCategory))
    .then(() => Promise.resolve()),
  );
  after(testUtil.clearDb);

  describe('PATCH /productCategories/{key}', () => {
    const body = {
      param: {
        displayName: 'displayName 1 - update',
        icon: 'http://example.com/icon1.ico - update',
        question: 'question 1 - update',
        info: 'info 1 - update',
        aliases: ['key-1-updated', 'key_1_updated'],
        disabled: true,
        hidden: true,
      },
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch(`/v4/productCategories/${key}`)
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .patch(`/v4/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .patch(`/v4/productCategories/${key}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .patch(`/v4/productCategories/${key}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed product category', (done) => {
      request(server)
        .patch('/v4/productCategories/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 404 for deleted product category', (done) => {
      models.ProductCategory.destroy({ where: { key } })
        .then(() => {
          request(server)
            .patch(`/v4/productCategories/${key}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(body)
            .expect(404, done);
        });
    });

    it('should return 200 for admin displayName updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.icon;
      delete partialBody.param.info;
      delete partialBody.param.question;
      delete partialBody.param.aliases;
      delete partialBody.param.disabled;
      delete partialBody.param.hidden;
      request(server)
        .patch(`/v4/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(partialBody.param.displayName);
          resJson.icon.should.be.eql(productCategory.icon);
          resJson.info.should.be.eql(productCategory.info);
          resJson.question.should.be.eql(productCategory.question);
          resJson.aliases.should.be.eql(productCategory.aliases);
          resJson.disabled.should.be.eql(productCategory.disabled);
          resJson.hidden.should.be.eql(productCategory.hidden);
          resJson.createdBy.should.be.eql(productCategory.createdBy);
          resJson.createdBy.should.be.eql(productCategory.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin icon updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.info;
      delete partialBody.param.displayName;
      delete partialBody.param.question;
      delete partialBody.param.aliases;
      delete partialBody.param.disabled;
      delete partialBody.param.hidden;
      request(server)
        .patch(`/v4/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(productCategory.displayName);
          resJson.icon.should.be.eql(partialBody.param.icon);
          resJson.info.should.be.eql(productCategory.info);
          resJson.question.should.be.eql(productCategory.question);
          resJson.aliases.should.be.eql(productCategory.aliases);
          resJson.disabled.should.be.eql(productCategory.disabled);
          resJson.hidden.should.be.eql(productCategory.hidden);
          resJson.createdBy.should.be.eql(productCategory.createdBy);
          resJson.createdBy.should.be.eql(productCategory.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin info updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.icon;
      delete partialBody.param.displayName;
      delete partialBody.param.question;
      delete partialBody.param.aliases;
      delete partialBody.param.disabled;
      delete partialBody.param.hidden;
      request(server)
        .patch(`/v4/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(productCategory.displayName);
          resJson.icon.should.be.eql(productCategory.icon);
          resJson.info.should.be.eql(partialBody.param.info);
          resJson.question.should.be.eql(productCategory.question);
          resJson.aliases.should.be.eql(productCategory.aliases);
          resJson.disabled.should.be.eql(productCategory.disabled);
          resJson.hidden.should.be.eql(productCategory.hidden);
          resJson.createdBy.should.be.eql(productCategory.createdBy);
          resJson.createdBy.should.be.eql(productCategory.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin question updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.icon;
      delete partialBody.param.info;
      delete partialBody.param.displayName;
      delete partialBody.param.aliases;
      delete partialBody.param.disabled;
      delete partialBody.param.hidden;
      request(server)
        .patch(`/v4/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(productCategory.displayName);
          resJson.icon.should.be.eql(productCategory.icon);
          resJson.info.should.be.eql(productCategory.info);
          resJson.question.should.be.eql(partialBody.param.question);
          resJson.aliases.should.be.eql(productCategory.aliases);
          resJson.disabled.should.be.eql(productCategory.disabled);
          resJson.hidden.should.be.eql(productCategory.hidden);
          resJson.createdBy.should.be.eql(productCategory.createdBy);
          resJson.createdBy.should.be.eql(productCategory.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin aliases updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.icon;
      delete partialBody.param.info;
      delete partialBody.param.question;
      delete partialBody.param.displayName;
      delete partialBody.param.disabled;
      delete partialBody.param.hidden;
      request(server)
        .patch(`/v4/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(productCategory.displayName);
          resJson.icon.should.be.eql(productCategory.icon);
          resJson.info.should.be.eql(productCategory.info);
          resJson.question.should.be.eql(productCategory.question);
          resJson.aliases.should.be.eql(partialBody.param.aliases);
          resJson.disabled.should.be.eql(productCategory.disabled);
          resJson.hidden.should.be.eql(productCategory.hidden);
          resJson.createdBy.should.be.eql(productCategory.createdBy);
          resJson.createdBy.should.be.eql(productCategory.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin disabled updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.icon;
      delete partialBody.param.info;
      delete partialBody.param.question;
      delete partialBody.param.displayName;
      delete partialBody.param.aliases;
      delete partialBody.param.hidden;
      request(server)
        .patch(`/v4/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(productCategory.displayName);
          resJson.icon.should.be.eql(productCategory.icon);
          resJson.info.should.be.eql(productCategory.info);
          resJson.question.should.be.eql(productCategory.question);
          resJson.aliases.should.be.eql(productCategory.aliases);
          resJson.disabled.should.be.eql(partialBody.param.disabled);
          resJson.hidden.should.be.eql(productCategory.hidden);
          resJson.createdBy.should.be.eql(productCategory.createdBy);
          resJson.createdBy.should.be.eql(productCategory.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin hidden updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.icon;
      delete partialBody.param.info;
      delete partialBody.param.question;
      delete partialBody.param.displayName;
      delete partialBody.param.disabled;
      delete partialBody.param.aliases;
      request(server)
        .patch(`/v4/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(productCategory.displayName);
          resJson.icon.should.be.eql(productCategory.icon);
          resJson.info.should.be.eql(productCategory.info);
          resJson.question.should.be.eql(productCategory.question);
          resJson.aliases.should.be.eql(productCategory.aliases);
          resJson.disabled.should.be.eql(productCategory.disabled);
          resJson.hidden.should.be.eql(partialBody.param.hidden);
          resJson.createdBy.should.be.eql(productCategory.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin all fields updated', (done) => {
      request(server)
        .patch(`/v4/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(body.param.displayName);
          resJson.icon.should.be.eql(body.param.icon);
          resJson.info.should.be.eql(body.param.info);
          resJson.question.should.be.eql(body.param.question);
          resJson.aliases.should.be.eql(body.param.aliases);
          resJson.disabled.should.be.eql(body.param.disabled);
          resJson.hidden.should.be.eql(body.param.hidden);
          resJson.createdBy.should.be.eql(productCategory.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .patch(`/v4/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(body.param.displayName);
          resJson.icon.should.be.eql(body.param.icon);
          resJson.info.should.be.eql(body.param.info);
          resJson.question.should.be.eql(body.param.question);
          resJson.aliases.should.be.eql(body.param.aliases);
          resJson.disabled.should.be.eql(body.param.disabled);
          resJson.hidden.should.be.eql(body.param.hidden);
          resJson.createdBy.should.be.eql(productCategory.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051336); // connect admin
          done();
        });
    });
  });
});
