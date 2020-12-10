/**
 * Tests for create.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';

import server from '../../app';
import testUtil from '../../tests/util';
import models from '../../models';

const should = chai.should();

describe('CREATE product category', () => {
  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.ProductCategory.create({
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
      }).then(() => done()));
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects/metadata/productCategories', () => {
    const body = {
      key: 'app_dev',
      displayName: 'Application Development',
      icon: 'prod-cat-app-icon',
      info: 'Application Development Info',
      question: 'What kind of devlopment you need?',
      aliases: ['key-1', 'key_1'],
      disabled: true,
      hidden: true,
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .post('/v5/projects/metadata/productCategories')
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .post('/v5/projects/metadata/productCategories')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .post('/v5/projects/metadata/productCategories')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .post('/v5/projects/metadata/productCategories')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 400 for missing key', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.key;

      request(server)
        .post('/v5/projects/metadata/productCategories')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 for missing displayName', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.displayName;

      request(server)
        .post('/v5/projects/metadata/productCategories')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 for missing icon', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.icon;

      request(server)
        .post('/v5/projects/metadata/productCategories')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 for missing question', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.question;

      request(server)
        .post('/v5/projects/metadata/productCategories')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 for missing info', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.info;

      request(server)
        .post('/v5/projects/metadata/productCategories')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 for duplicated key', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.key = 'key1';

      request(server)
        .post('/v5/projects/metadata/productCategories')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 201 for admin', (done) => {
      request(server)
        .post('/v5/projects/metadata/productCategories')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          resJson.key.should.be.eql(body.key);
          resJson.displayName.should.be.eql(body.displayName);
          resJson.icon.should.be.eql(body.icon);
          resJson.info.should.be.eql(body.info);
          resJson.question.should.be.eql(body.question);
          resJson.aliases.should.be.eql(body.aliases);
          resJson.disabled.should.be.eql(body.disabled);
          resJson.hidden.should.be.eql(body.hidden);

          resJson.createdBy.should.be.eql(40051333); // admin
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 201 for connect admin', (done) => {
      request(server)
        .post('/v5/projects/metadata/productCategories')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          resJson.key.should.be.eql(body.key);
          resJson.displayName.should.be.eql(body.displayName);
          resJson.icon.should.be.eql(body.icon);
          resJson.info.should.be.eql(body.info);
          resJson.question.should.be.eql(body.question);
          resJson.aliases.should.be.eql(body.aliases);
          resJson.disabled.should.be.eql(body.disabled);
          resJson.hidden.should.be.eql(body.hidden);
          resJson.createdBy.should.be.eql(40051336); // connect admin
          resJson.updatedBy.should.be.eql(40051336); // connect admin
          done();
        });
    });
  });
});
