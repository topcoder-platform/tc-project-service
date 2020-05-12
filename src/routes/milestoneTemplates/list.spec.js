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
    category: 'category',
    subCategory: 'category',
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
    category: 'category',
    subCategory: 'category',
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
    plannedText: 'text to be shown in planned stage',
    blockedText: 'text to be shown in blocked stage',
    activeText: 'text to be shown in active stage',
    completedText: 'text to be shown in completed stage',
    reference: 'productTemplate',
    referenceId: 1,
    metadata: {},
    createdBy: 1,
    updatedBy: 2,
  },
  {
    id: 2,
    name: 'milestoneTemplate 2',
    duration: 4,
    type: 'type2',
    order: 2,
    plannedText: 'text to be shown in planned stage - 2',
    blockedText: 'text to be shown in blocked stage - 2',
    activeText: 'text to be shown in active stage - 2',
    completedText: 'text to be shown in completed stage - 2',
    reference: 'productTemplate',
    referenceId: 1,
    metadata: {},
    createdBy: 2,
    updatedBy: 3,
  },
  {
    id: 3,
    name: 'milestoneTemplate 3',
    duration: 5,
    type: 'type3',
    order: 3,
    plannedText: 'text to be shown in planned stage - 3',
    blockedText: 'text to be shown in blocked stage - 3',
    activeText: 'text to be shown in active stage - 3',
    completedText: 'text to be shown in completed stage - 3',
    reference: 'productTemplate',
    referenceId: 1,
    metadata: {},
    createdBy: 2,
    updatedBy: 3,
    deletedAt: new Date(),
  },
];

describe('LIST milestone template', () => {
  before((done) => {
    testUtil.clearES(done);
  });
  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.ProductTemplate.bulkCreate(productTemplates))
      .then(() => { models.MilestoneTemplate.bulkCreate(milestoneTemplates).then(() => done()); });
  },
  );
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /timelines/metadata/milestoneTemplates', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v5/timelines/metadata/milestoneTemplates')
        .expect(403, done);
    });

    it('should return 400 for invalid sort column', (done) => {
      request(server)
        .get('/v5/timelines/metadata/milestoneTemplates?sort=id')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(400, done);
    });

    it('should return 400 for invalid sort order', (done) => {
      request(server)
        .get('/v5/timelines/metadata/milestoneTemplates?sort=order invalid')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(400, done);
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v5/timelines/metadata/milestoneTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(2);
          resJson[0].id.should.be.eql(milestoneTemplates[0].id);
          resJson[0].name.should.be.eql(milestoneTemplates[0].name);
          resJson[0].duration.should.be.eql(milestoneTemplates[0].duration);
          resJson[0].type.should.be.eql(milestoneTemplates[0].type);
          resJson[0].order.should.be.eql(milestoneTemplates[0].order);
          resJson[0].plannedText.should.be.eql(milestoneTemplates[0].plannedText);
          resJson[0].blockedText.should.be.eql(milestoneTemplates[0].blockedText);
          resJson[0].activeText.should.be.eql(milestoneTemplates[0].activeText);
          resJson[0].completedText.should.be.eql(milestoneTemplates[0].completedText);
          resJson[0].reference.should.be.eql(milestoneTemplates[0].reference);
          resJson[0].referenceId.should.be.eql(milestoneTemplates[0].referenceId);
          resJson[0].metadata.should.be.eql(milestoneTemplates[0].metadata);

          resJson[0].createdBy.should.be.eql(milestoneTemplates[0].createdBy);
          should.exist(resJson[0].createdAt);
          resJson[0].updatedBy.should.be.eql(milestoneTemplates[0].updatedBy);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);

          done();
        });
    });

    it('should return 200 for connect admin with reference and referenceId filters', (done) => {
      request(server)
        .get('/v5/timelines/metadata/milestoneTemplates?reference=productTemplate&referenceId=1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get('/v5/timelines/metadata/milestoneTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get('/v5/timelines/metadata/milestoneTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get('/v5/timelines/metadata/milestoneTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });

    it('should return 200 with sort desc', (done) => {
      request(server)
        .get('/v5/timelines/metadata/milestoneTemplates?sort=order%20desc')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(2);
          resJson[0].id.should.be.eql(2);
          resJson[1].id.should.be.eql(1);

          done();
        });
    });
  });
});
