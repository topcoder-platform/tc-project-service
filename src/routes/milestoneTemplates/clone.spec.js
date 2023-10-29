/**
 * Tests for create.js
 */
import chai from 'chai';
import request from 'supertest';
import server from '../../app';
import testUtil from '../../tests/util';
import models from '../../models';

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
    name: 'name 2',
    productKey: 'productKey 2',
    category: 'category',
    subCategory: 'category',
    icon: 'http://example.com/icon1.ico',
    brief: 'brief 2',
    details: 'details 2',
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
];
const milestoneTemplates = [
  {
    name: 'milestoneTemplate 1',
    duration: 3,
    type: 'type1',
    order: 1,
    reference: 'productTemplate',
    referenceId: 1,
    metadata: {},
    plannedText: 'text to be shown in planned stage',
    blockedText: 'text to be shown in blocked stage',
    activeText: 'text to be shown in active stage',
    completedText: 'text to be shown in completed stage',
    createdBy: 1,
    updatedBy: 2,
  },
  {
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
];

describe('CLONE milestone template', () => {
  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.ProductTemplate.bulkCreate(productTemplates))
      .then(() => { models.MilestoneTemplate.bulkCreate(milestoneTemplates).then(() => done()); });
  },
  );
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /timelines/metadata/milestoneTemplates/clone', () => {
    const body = {
      sourceReference: 'productTemplate',
      sourceReferenceId: 1,
      reference: 'productTemplate',
      referenceId: 2,
    };

    it('should return 403 if user is not authenticated/clone', (done) => {
      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates/clone')
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates/clone')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates/clone')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates/clone')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 400 for non-existent product template', (done) => {
      const invalidBody = {
        sourceReference: 'productTemplate',
        sourceReferenceId: 1,
        reference: 'productTemplate',
        referenceId: 2000,
      };

      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates/clone')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect(400, done);
    });

    it('should return 400 for non-existent source product template', (done) => {
      const invalidBody = {
        sourceReference: 'product',
        sourceReferenceId: 1000,
        reference: 'product',
        referenceId: 2,
      };

      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates/clone')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect(400, done);
    });

    it('should return 400 if missing sourceReference', (done) => {
      const invalidBody = {
        sourceReferenceId: 1000,
        reference: 'productTemplate',
        referenceId: 2,
      };

      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates/clone')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 201 for admin', (done) => {
      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates/clone')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(2);
          should.not.equal(resJson[0].id, null);
          resJson[0].name.should.be.eql(milestoneTemplates[0].name);
          resJson[0].duration.should.be.eql(milestoneTemplates[0].duration);
          resJson[0].type.should.be.eql(milestoneTemplates[0].type);
          resJson[0].order.should.be.eql(milestoneTemplates[0].order);
          resJson[0].plannedText.should.be.eql(milestoneTemplates[0].plannedText);
          resJson[0].blockedText.should.be.eql(milestoneTemplates[0].blockedText);
          resJson[0].activeText.should.be.eql(milestoneTemplates[0].activeText);
          resJson[0].completedText.should.be.eql(milestoneTemplates[0].completedText);
          resJson[0].reference.should.be.eql('productTemplate');
          resJson[0].referenceId.should.be.eql(2);
          resJson[0].metadata.should.be.eql({});

          resJson[0].createdBy.should.be.eql(40051333); // admin
          should.exist(resJson[0].createdAt);
          resJson[0].updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);

          done();
        });
    });

    it('should return 201 for connect admin', (done) => {
      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates/clone')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(2);
          resJson[0].createdBy.should.be.eql(40051336); // connect admin
          resJson[0].updatedBy.should.be.eql(40051336); // connect admin
          done();
        });
    });
  });
});
