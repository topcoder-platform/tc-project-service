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

describe('CREATE product template', () => {
  before((done) => {
    testUtil.clearDb()
      .then(() => models.ProductCategory.bulkCreate([
        {
          key: 'generic',
          displayName: 'Generic',
          icon: 'http://example.com/icon1.ico',
          question: 'question 1',
          info: 'info 1',
          aliases: ['key-1', 'key_1'],
          createdBy: 1,
          updatedBy: 1,
        },
      ]))
      .then(() => done());
  });

  describe('POST /projects/metadata/productTemplates', () => {
    const body = {
      param: {
        name: 'name 1',
        productKey: 'productKey 1',
        category: 'generic',
        subCategory: 'generic',
        icon: 'http://example.com/icon1.ico',
        brief: 'brief 1',
        details: 'details 1',
        aliases: ['product key 1', 'product_key_1'],
        disabled: true,
        hidden: true,
        template: {
          template1: {
            name: 'template 1',
            details: {
              anyDetails: 'any details 1',
            },
            others: ['others 11', 'others 12'],
          },
          template2: {
            name: 'template 2',
            details: {
              anyDetails: 'any details 2',
            },
            others: ['others 21', 'others 22'],
          },
        },
      },
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .post('/v4/projects/metadata/productTemplates')
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .post('/v4/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .post('/v4/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for connect manager', (done) => {
      request(server)
        .post('/v4/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 422 if validations dont pass', (done) => {
      const invalidBody = {
        param: {
          aliases: 'a',
          template: 1,
        },
      };

      request(server)
        .post('/v4/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if product category is missing', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.param.category = null;
      request(server)
        .post('/v4/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if product category does not exist', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.param.category = 'not_exist';
      request(server)
        .post('/v4/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 201 for admin', (done) => {
      request(server)
        .post('/v4/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.result.content;
          should.exist(resJson.id);
          resJson.name.should.be.eql(body.param.name);
          resJson.productKey.should.be.eql(body.param.productKey);
          resJson.category.should.be.eql(body.param.category);
          resJson.icon.should.be.eql(body.param.icon);
          resJson.brief.should.be.eql(body.param.brief);
          resJson.details.should.be.eql(body.param.details);
          resJson.aliases.should.be.eql(body.param.aliases);
          resJson.template.should.be.eql(body.param.template);
          resJson.disabled.should.be.eql(true);
          resJson.hidden.should.be.eql(true);

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
        .post('/v4/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.createdBy.should.be.eql(40051336); // connect admin
          resJson.updatedBy.should.be.eql(40051336); // connect admin
          done();
        });
    });
  });
});
