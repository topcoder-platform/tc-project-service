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

describe('UPDATE product template', () => {
  const template = {
    name: 'name 1',
    productKey: 'productKey 1',
    category: 'generic',
    subCategory: 'generic',
    icon: 'http://example.com/icon1.ico',
    brief: 'brief 1',
    details: 'details 1',
    aliases: ['productTemplate-1', 'productTemplate_1'],
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
    createdBy: 1,
    updatedBy: 2,
  };

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

  let templateId;

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.Form.create(forms[0]))
      .then(() => models.Form.create(forms[1]))
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
        {
          key: 'concrete',
          displayName: 'Concrete',
          icon: 'http://example.com/icon1.ico',
          question: 'question 2',
          info: 'info 2',
          aliases: ['key-2', 'key_2'],
          createdBy: 1,
          updatedBy: 1,
        },
      ]))
      .then(() => models.ProductTemplate.create(template).then((createdTemplate) => {
        templateId = createdTemplate.id;
        done();
      }));
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('PATCH /projects/metadata/productTemplates/{templateId}', () => {
    const body = {
      name: 'template 1 - update',
      productKey: 'productKey 1 - update',
      category: 'concrete',
      subCategory: 'concrete',
      icon: 'http://example.com/icon1-update.ico',
      brief: 'brief 1 - update',
      details: 'details 1 - update',
      aliases: ['productTemplate-1-update', 'productTemplate_1-update'],
      template: {
        template1: {
          name: 'template 1 - update',
          details: {
            anyDetails: 'any details 1 - update',
            newDetails: 'new',
          },
          others: ['others new'],
        },
        template3: {
          name: 'template 3',
          details: {
            anyDetails: 'any details 3',
          },
          others: ['others 31', 'others 32'],
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
        .patch(`/v5/projects/metadata/productTemplates/${templateId}`)
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .patch(`/v5/projects/metadata/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .patch(`/v5/projects/metadata/productTemplates/${templateId}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for connect manager', (done) => {
      request(server)
        .patch(`/v5/projects/metadata/productTemplates/${templateId}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 400 for invalid request', (done) => {
      const invalidBody = {
        aliases: 'a',
        template: 1,
      };

      request(server)
        .patch(`/v5/projects/metadata/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect(400, done);
    });

    it('should return 404 for non-existed template', (done) => {
      request(server)
        .patch('/v5/projects/metadata/productTemplates/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 404 for deleted template', (done) => {
      models.ProductTemplate.destroy({ where: { id: templateId } })
        .then(() => {
          request(server)
            .patch(`/v5/projects/metadata/productTemplates/${templateId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(body)
            .expect(404, done);
        });
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .patch(`/v5/projects/metadata/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.id.should.be.eql(templateId);
          resJson.name.should.be.eql(body.name);
          resJson.productKey.should.be.eql(body.productKey);
          resJson.category.should.be.eql(body.category);
          resJson.icon.should.be.eql(body.icon);
          resJson.brief.should.be.eql(body.brief);
          resJson.details.should.be.eql(body.details);
          resJson.disabled.should.be.eql(true);
          resJson.hidden.should.be.eql(true);
          resJson.aliases.should.be.eql(body.aliases);
          resJson.template.should.be.eql({
            template1: {
              name: 'template 1 - update',
              details: {
                anyDetails: 'any details 1 - update',
                newDetails: 'new',
              },
              others: ['others new'],
            },
            template2: {
              name: 'template 2',
              details: {
                anyDetails: 'any details 2',
              },
              others: ['others 21', 'others 22'],
            },
            template3: {
              name: 'template 3',
              details: {
                anyDetails: 'any details 3',
              },
              others: ['others 31', 'others 32'],
            },
          });
          resJson.createdBy.should.be.eql(template.createdBy);
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
        .patch(`/v5/projects/metadata/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });

    it('should return 200 when update form', (done) => {
      request(server)
        .patch(`/v5/projects/metadata/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(bodyWithForm)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.form.should.be.eql(bodyWithForm.form);
          done();
        });
    });

    it('should return 400 when form is invalid', (done) => {
      request(server)
        .patch(`/v5/projects/metadata/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(bodyInvalidForm)
        .expect(400, done);
    });

    it('should return 400 if both form or template field are defined', (done) => {
      request(server)
        .patch(`/v5/projects/metadata/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(bodyDefinedFormTemplate)
        .expect(400, done);
    });

    it('should return 400 if both form or template field are missing', (done) => {
      request(server)
        .patch(`/v5/projects/metadata/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(bodyMissingFormTemplate)
        .expect(400, done);
    });
  });
});
