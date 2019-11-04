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
  const productCategories = [
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
  ];

  const forms = [
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
  ];

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.ProductCategory.bulkCreate(productCategories))
      .then(() => models.Form.create(forms[0]))
      .then(() => models.Form.create(forms[1]).then(() => done()));
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects/metadata/productTemplates', () => {
    const body = {
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
      isAddOn: true,
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
    };

    const bodyDefinedFormTemplate = _.cloneDeep(body);
    bodyDefinedFormTemplate.form = {
      version: 1,
      key: 'dev',
    };

    const bodyWithForm = _.cloneDeep(bodyDefinedFormTemplate);
    delete bodyWithForm.template;

    const bodyMissingFormTemplate = _.cloneDeep(bodyWithForm);
    delete bodyMissingFormTemplate.form;

    const bodyInvalidForm = _.cloneDeep(body);
    bodyInvalidForm.form = {
      version: 1,
      key: 'wrongKey',
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .post('/v5/projects/metadata/productTemplates')
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .post('/v5/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .post('/v5/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for connect manager', (done) => {
      request(server)
        .post('/v5/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 400 if validations dont pass', (done) => {
      const invalidBody = {
        aliases: 'a',
        template: 1,
      };

      request(server)
        .post('/v5/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if product category is missing', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.category = null;
      request(server)
        .post('/v5/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if product category does not exist', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.category = 'not_exist';
      request(server)
        .post('/v5/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 201 for admin', (done) => {
      request(server)
        .post('/v5/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          should.exist(resJson.id);
          resJson.name.should.be.eql(body.name);
          resJson.productKey.should.be.eql(body.productKey);
          resJson.category.should.be.eql(body.category);
          resJson.icon.should.be.eql(body.icon);
          resJson.brief.should.be.eql(body.brief);
          resJson.details.should.be.eql(body.details);
          resJson.aliases.should.be.eql(body.aliases);
          resJson.template.should.be.eql(body.template);
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
        .post('/v5/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          resJson.createdBy.should.be.eql(40051336); // connect admin
          resJson.updatedBy.should.be.eql(40051336); // connect admin
          done();
        });
    });

    it('should return 201 with form data', (done) => {
      request(server)
        .post('/v5/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(bodyWithForm)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          should.exist(resJson.id);
          resJson.name.should.be.eql(bodyWithForm.name);
          resJson.productKey.should.be.eql(bodyWithForm.productKey);
          resJson.category.should.be.eql(bodyWithForm.category);
          resJson.icon.should.be.eql(bodyWithForm.icon);
          resJson.brief.should.be.eql(bodyWithForm.brief);
          resJson.details.should.be.eql(bodyWithForm.details);
          resJson.aliases.should.be.eql(bodyWithForm.aliases);
          resJson.form.should.be.eql(bodyWithForm.form);
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

    it('should return 400 when form is invalid', (done) => {
      request(server)
        .post('/v5/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(bodyInvalidForm)
        .expect(400, done);
    });

    it('should return 400 if both form or template field are defined', (done) => {
      request(server)
        .post('/v5/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(bodyDefinedFormTemplate)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if both form or template field are missing', (done) => {
      request(server)
        .post('/v5/projects/metadata/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(bodyMissingFormTemplate)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });
  });
});
