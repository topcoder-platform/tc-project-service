/**
 * Tests for list.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('LIST product templates', () => {
  const templates = [
    {
      name: 'name 1',
      productKey: 'productKey 1',
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
    },
    {
      name: 'template 2',
      productKey: 'productKey 2',
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
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v4/productTemplates')
        .expect(403, done);
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v4/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const template = templates[0];

          const resJson = res.body.result.content;
          resJson.should.have.length(2);
          resJson[0].id.should.be.eql(templateId);
          resJson[0].name.should.be.eql(template.name);
          resJson[0].productKey.should.be.eql(template.productKey);
          resJson[0].icon.should.be.eql(template.icon);
          resJson[0].brief.should.be.eql(template.brief);
          resJson[0].details.should.be.eql(template.details);
          resJson[0].aliases.should.be.eql(template.aliases);
          resJson[0].template.should.be.eql(template.template);

          resJson[0].createdBy.should.be.eql(template.createdBy);
          should.exist(resJson[0].createdAt);
          resJson[0].updatedBy.should.be.eql(template.updatedBy);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);

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
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get('/v4/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get('/v4/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get('/v4/productTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });
  });
});
