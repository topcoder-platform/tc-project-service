/**
 * Tests for list.js
 */
// import chai from 'chai';
import _ from 'lodash';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

// const should = chai.should();

const validateProductTemplates = (count, resJson, expectedTemplates) => {
  resJson.should.have.length(count);
  resJson.forEach((pt, idx) => {
    pt.should.have.all.keys('id', 'name', 'productKey', 'category', 'icon', 'brief', 'details', 'aliases',
    'template', 'disabled', 'hidden', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt');
    pt.should.not.have.all.keys('deletedAt', 'deletedBy');
    pt.name.should.be.eql(expectedTemplates[idx].name);
    pt.productKey.should.be.eql(expectedTemplates[idx].productKey);
    pt.category.should.be.eql(expectedTemplates[idx].category);
    pt.icon.should.be.eql(expectedTemplates[idx].icon);
    pt.brief.should.be.eql(expectedTemplates[idx].brief);
    pt.details.should.be.eql(expectedTemplates[idx].details);
    pt.aliases.should.be.eql(expectedTemplates[idx].aliases);
    pt.template.should.be.eql(expectedTemplates[idx].template);
    pt.createdBy.should.be.eql(expectedTemplates[idx].createdBy);
    pt.updatedBy.should.be.eql(expectedTemplates[idx].updatedBy);
    pt.disabled.should.be.eql(_.get(expectedTemplates[idx], 'disabled', false));
    pt.hidden.should.be.eql(_.get(expectedTemplates[idx], 'hidden', false));
  });
};

describe('LIST product templates', () => {
  const templates = [
    {
      name: 'name 1',
      productKey: 'productKey-1',
      category: 'generic',
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
    },
    {
      name: 'template 2',
      productKey: 'productKey-2',
      category: 'concrete',
      icon: 'http://example.com/icon2.ico',
      brief: 'brief 2',
      details: 'details 2',
      aliases: {},
      template: {},
      createdBy: 3,
      updatedBy: 4,
    },
  ];

  let templateId;

  beforeEach(() => testUtil.clearDb()
    .then(() => models.ProductTemplate.create(templates[0]))
    .then((createdTemplate) => {
      templateId = createdTemplate.id;
      return models.ProductTemplate.create(templates[1]);
    }).then(() => Promise.resolve()),
  );
  after(testUtil.clearDb);

  describe('GET /productTemplates', () => {
    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v4/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          validateProductTemplates(2, resJson, templates);
          resJson[0].id.should.be.eql(templateId);
          done();
        });
    });

    it('should return 200 even if user is not authenticated', (done) => {
      request(server)
        .get('/v4/productTemplates')
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          validateProductTemplates(2, resJson, templates);
          resJson[0].id.should.be.eql(templateId);
          done();
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get('/v4/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          validateProductTemplates(2, resJson, templates);
          resJson[0].id.should.be.eql(templateId);
          done();
        });
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get('/v4/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          validateProductTemplates(2, resJson, templates);
          resJson[0].id.should.be.eql(templateId);
          done();
        });
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get('/v4/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .end((err, res) => {
          const resJson = res.body.result.content;
          validateProductTemplates(2, resJson, templates);
          resJson[0].id.should.be.eql(templateId);
          done();
        });
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get('/v4/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .end((err, res) => {
          const resJson = res.body.result.content;
          validateProductTemplates(2, resJson, templates);
          resJson[0].id.should.be.eql(templateId);
          done();
        });
    });

    it('should return filtered templates', (done) => {
      request(server)
        .get('/v4/productTemplates?filter=productKey%3DproductKey-2')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          validateProductTemplates(1, resJson, [templates[1]]);
          done();
        });
    });
  });
});
