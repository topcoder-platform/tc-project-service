/**
 * Tests for get.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('UPGRADE product template', () => {
  const productTemplate = {
    name: 'name 1',
    productKey: 'productKey1',
    category: 'generic',
    subCategory: 'generic',
    icon: 'http://example.com/icon1.ico',
    brief: 'brief 1',
    details: 'details 1',
    aliases: ['productTemplate-1', 'productTemplate_1'],
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
    createdBy: 1,
    updatedBy: 2,
  };

  const productTemplateMissed = {
    name: 'name 2',
    productKey: 'productKey2',
    category: 'generic',
    subCategory: 'generic',
    icon: 'http://example.com/icon1.ico',
    brief: 'brief 1',
    details: 'details 1',
    aliases: ['productTemplate-1', 'productTemplate_1'],
    disabled: true,
    hidden: true,
    createdBy: 1,
    updatedBy: 2,
  };

  let templateId;
  let missingTemplateId;

  beforeEach(() => testUtil.clearDb()
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
    .then(() => {
      const config = {
        questions: [{
          id: 'appDefinition',
          title: 'Sample Project',
          required: true,
          description: 'Please answer a few basic questions',
          subSections: [{
            id: 'projectName',
            required: true,
            validationError: 'Please provide a name for your project',
            fieldName: 'name',
            description: '',
            title: 'Project Name',
            type: 'project-name',
          }, {
            id: 'notes',
            fieldName: 'details.appDefinition.notes',
            title: 'Notes',
            description: 'Add any other important information',
            type: 'notes',
          }],
        }],
      };
      models.Form.bulkCreate([
        {
          key: 'newKey',
          version: 1,
          revision: 1,
          config,
          createdBy: 1,
          updatedBy: 1,
        },
      ]);
    })
    .then(() => models.ProductTemplate.create(productTemplate))
    .then((createdTemplate) => {
      templateId = createdTemplate.id;
    })
    .then(() => models.ProductTemplate.create(productTemplateMissed))
    .then((createdTemplate) => {
      missingTemplateId = createdTemplate.id;
    }),
  );
  after(testUtil.clearDb);

  describe('POST /projects/metadata/productTemplates/{templateId}/upgrade', () => {
    const body = {
      param: {
        form: {
          key: 'newKey',
          version: 1,
        },
      },
    };

    const bodyInvalidForm = {
      param: {
        form: {
          key: 'wrongKey',
          version: 1,
        },
      },
    };

    const emptyBody = {
      param: {
      },
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .post(`/v4/projects/metadata/productTemplates/${templateId}/upgrade`)
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .post(`/v4/projects/metadata/productTemplates/${templateId}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .post(`/v4/projects/metadata/productTemplates/${templateId}/upgrade`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for connect manager', (done) => {
      request(server)
        .post(`/v4/projects/metadata/productTemplates/${templateId}/upgrade`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 422 for invalid request', (done) => {
      const invalidBody = {
        param: {
          form: {
            key: 'notvalid',
            version: 1,
          },
        },
      };

      request(server)
        .post(`/v4/projects/metadata/productTemplates/${templateId}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect(422, done);
    });

    it('should return 404 for non-existed template', (done) => {
      request(server)
        .post('/v4/projects/metadata/productTemplates/1234/upgrade')
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
            .post(`/v4/projects/metadata/productTemplates/${templateId}/upgrade`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(body)
            .expect(404, done);
        });
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .post(`/v4/projects/metadata/productTemplates/${templateId}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.id.should.be.eql(templateId);
          should.not.exist(resJson.template);

          resJson.form.should.be.eql({
            key: 'newKey',
            version: 1,
          });

          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should create new version of model if param not given model key and version', (done) => {
      request(server)
        .post(`/v4/projects/metadata/productTemplates/${templateId}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(emptyBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;

          should.not.exist(resJson.scope);
          should.not.exist(resJson.phases);

          resJson.form.should.be.eql({
            key: 'productKey1',
            version: 1,
          });

          resJson.createdBy.should.be.eql(productTemplate.createdBy);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 422 when form is invalid', (done) => {
      request(server)
        .post(`/v4/projects/metadata/productTemplates/${templateId}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(bodyInvalidForm)
        .expect(422, done);
    });

    it('should return 422 when template is missing', (done) => {
      request(server)
        .post(`/v4/projects/metadata/productTemplates/${missingTemplateId}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(422, done);
    });
  });
});
