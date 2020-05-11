/**
 * Tests for create.js
 */
import chai from 'chai';
import request from 'supertest';
import _ from 'lodash';
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

describe('CREATE milestone template', () => {
  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.ProductTemplate.bulkCreate(productTemplates))
      .then(() => { models.MilestoneTemplate.bulkCreate(milestoneTemplates).then(() => done()); });
  },
  );
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /timelines/metadata/milestoneTemplates', () => {
    const body = {
      name: 'milestoneTemplate 3',
      description: 'description 3',
      duration: 33,
      type: 'type3',
      order: 1,
      plannedText: 'text to be shown in planned stage - 3',
      blockedText: 'text to be shown in blocked stage - 3',
      activeText: 'text to be shown in active stage - 3',
      completedText: 'text to be shown in completed stage - 3',
      hidden: true,
      reference: 'productTemplate',
      referenceId: 1,
      metadata: {},
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates')
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 400 for non-existed product template', (done) => {
      const invalidBody = _.assign({}, body, { referenceId: 1000 });

      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect(400, done);
    });

    it('should return 400 if missing name', (done) => {
      const invalidBody = {
        name: undefined,
      };

      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if missing duration', (done) => {
      const invalidBody = {
        duration: undefined,
      };

      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if missing type', (done) => {
      const invalidBody = {
        type: undefined,
      };

      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if missing order', (done) => {
      const invalidBody = {
        order: undefined,
      };

      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 201 for admin', (done) => {
      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates')
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
          resJson.description.should.be.eql(body.description);
          resJson.duration.should.be.eql(body.duration);
          resJson.type.should.be.eql(body.type);
          resJson.order.should.be.eql(body.order);
          resJson.plannedText.should.be.eql(body.plannedText);
          resJson.blockedText.should.be.eql(body.blockedText);
          resJson.activeText.should.be.eql(body.activeText);
          resJson.completedText.should.be.eql(body.completedText);
          resJson.reference.should.be.eql(body.reference);
          resJson.referenceId.should.be.eql(body.referenceId);
          resJson.metadata.should.be.eql(body.metadata);

          resJson.createdBy.should.be.eql(40051333); // admin
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          // Verify 'order' of the other milestones
          models.MilestoneTemplate.findAll({
            where: {
              reference: body.reference,
              referenceId: body.referenceId,
            },
          }).then((milestones) => {
            _.each(milestones, (milestone) => {
              if (milestone.id === 1) {
                milestone.order.should.be.eql(1 + 1);
              } else if (milestone.id === 2) {
                milestone.order.should.be.eql(2 + 1);
              }
            });
            done();
          }).catch((error) => {
            done(error);
          });
        });
    });

    it('should return 201 for admin without optional fields', (done) => {
      const minimalBody = _.cloneDeep(body);
      delete minimalBody.hidden;
      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(minimalBody)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          resJson.hidden.should.be.eql(false); // default of hidden field
          done();
        });
    });

    it('should return 201 for connect admin', (done) => {
      request(server)
        .post('/v5/timelines/metadata/milestoneTemplates')
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
  });
});
