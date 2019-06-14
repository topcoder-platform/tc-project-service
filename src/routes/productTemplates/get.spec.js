/**
 * Tests for get.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('GET product template', () => {
  const template = {
    name: 'name 1',
    productKey: 'productKey 1',
    category: 'generic',
    subCategory: 'generic',
    icon: 'http://example.com/icon1.ico',
    brief: 'brief 1',
    details: 'details 1',
    aliases: {
      alias1: {
        subAlias1A: 1,
        subAlias1B: 2,
      },
      alias2: [1, 2, 3],
    },
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

  let templateId;

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.ProductTemplate.create(template).then((createdTemplate) => {
        templateId = createdTemplate.id;
        done();
      }));
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/metadata/productTemplates/{templateId}', () => {
    it('should return 404 for non-existed template', (done) => {
      request(server)
        .get('/v5/projects/metadata/productTemplates/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted template', (done) => {
      models.ProductTemplate.destroy({ where: { id: templateId } })
        .then(() => {
          request(server)
            .get(`/v5/projects/metadata/productTemplates/${templateId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get(`/v5/projects/metadata/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.id.should.be.eql(templateId);
          resJson.name.should.be.eql(template.name);
          resJson.productKey.should.be.eql(template.productKey);
          resJson.category.should.be.eql(template.category);
          resJson.icon.should.be.eql(template.icon);
          resJson.brief.should.be.eql(template.brief);
          resJson.details.should.be.eql(template.details);
          resJson.aliases.should.be.eql(template.aliases);
          resJson.template.should.be.eql(template.template);

          resJson.createdBy.should.be.eql(template.createdBy);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(template.updatedBy);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get(`/v5/projects/metadata/productTemplates/${templateId}`)
        .expect(403, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get(`/v5/projects/metadata/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get(`/v5/projects/metadata/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get(`/v5/projects/metadata/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get(`/v5/projects/metadata/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });
  });
});
