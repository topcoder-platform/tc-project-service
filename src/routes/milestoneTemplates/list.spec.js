/**
 * Tests for list.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

const productTemplates = [
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
    deletedAt: new Date(),
  },
];
const milestoneTemplates = [
  {
    id: 1,
    name: 'milestoneTemplate 1',
    duration: 3,
    type: 'type1',
    order: 1,
    productTemplateId: 1,
    createdBy: 1,
    updatedBy: 2,
  },
  {
    id: 2,
    name: 'milestoneTemplate 2',
    duration: 4,
    type: 'type2',
    order: 2,
    productTemplateId: 1,
    createdBy: 2,
    updatedBy: 3,
  },
  {
    id: 3,
    name: 'milestoneTemplate 3',
    duration: 5,
    type: 'type3',
    order: 3,
    productTemplateId: 1,
    createdBy: 2,
    updatedBy: 3,
    deletedAt: new Date(),
  },
];

describe('LIST milestone template', () => {
  beforeEach(() => testUtil.clearDb()
    .then(() => models.ProductTemplate.bulkCreate(productTemplates))
    .then(() => models.ProductMilestoneTemplate.bulkCreate(milestoneTemplates)),
  );
  after(testUtil.clearDb);

  describe('GET /productTemplates/{productTemplateId}/milestones', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v4/productTemplates/1/milestones')
        .expect(403, done);
    });

    it('should return 422 for invalid productTemplateId param', (done) => {
      request(server)
        .get('/v4/productTemplates/0/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(422, done);
    });

    it('should return 422 for invalid sort column', (done) => {
      request(server)
        .get('/v4/productTemplates/1/milestones?sort=id')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(422, done);
    });

    it('should return 422 for invalid sort order', (done) => {
      request(server)
        .get('/v4/productTemplates/1/milestones?sort=order%20invalid')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(422, done);
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v4/productTemplates/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.should.have.length(2);
          resJson[0].id.should.be.eql(milestoneTemplates[0].id);
          resJson[0].name.should.be.eql(milestoneTemplates[0].name);
          resJson[0].duration.should.be.eql(milestoneTemplates[0].duration);
          resJson[0].type.should.be.eql(milestoneTemplates[0].type);
          resJson[0].order.should.be.eql(milestoneTemplates[0].order);
          resJson[0].productTemplateId.should.be.eql(milestoneTemplates[0].productTemplateId);

          resJson[0].createdBy.should.be.eql(milestoneTemplates[0].createdBy);
          should.exist(resJson[0].createdAt);
          resJson[0].updatedBy.should.be.eql(milestoneTemplates[0].updatedBy);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);

          done();
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get('/v4/productTemplates/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get('/v4/productTemplates/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get('/v4/productTemplates/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get('/v4/productTemplates/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });

    it('should return 200 with sort desc', (done) => {
      request(server)
        .get('/v4/productTemplates/1/milestones?sort=order%20desc')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.should.have.length(2);
          resJson[0].id.should.be.eql(2);
          resJson[1].id.should.be.eql(1);

          done();
        });
    });
  });
});
