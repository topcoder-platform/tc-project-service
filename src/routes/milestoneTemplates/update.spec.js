/**
 * Tests for get.js
 */
import chai from 'chai';
import request from 'supertest';
import _ from 'lodash';
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
    plannedText: 'text to be shown in planned stage',
    blockedText: 'text to be shown in blocked stage',
    activeText: 'text to be shown in active stage',
    completedText: 'text to be shown in completed stage',
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
    plannedText: 'text to be shown in planned stage - 2',
    blockedText: 'text to be shown in blocked stage - 2',
    activeText: 'text to be shown in active stage - 2',
    completedText: 'text to be shown in completed stage - 2',
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
    plannedText: 'text to be shown in planned stage - 3',
    blockedText: 'text to be shown in blocked stage - 3',
    activeText: 'text to be shown in active stage - 3',
    completedText: 'text to be shown in completed stage - 3',
    productTemplateId: 1,
    createdBy: 2,
    updatedBy: 3,
  },
  {
    id: 4,
    name: 'milestoneTemplate 4',
    duration: 5,
    type: 'type4',
    order: 4,
    plannedText: 'text to be shown in planned stage - 4',
    blockedText: 'text to be shown in blocked stage - 4',
    activeText: 'text to be shown in active stage - 4',
    completedText: 'text to be shown in completed stage - 4',
    productTemplateId: 1,
    createdBy: 2,
    updatedBy: 3,
    deletedAt: new Date(),
  },
];

describe('UPDATE milestone template', () => {
  beforeEach(() => testUtil.clearDb()
    .then(() => models.ProductTemplate.bulkCreate(productTemplates))
    .then(() => models.ProductMilestoneTemplate.bulkCreate(milestoneTemplates)),
  );
  after(testUtil.clearDb);

  describe('PATCH /productTemplates/{productTemplateId}/milestones/{milestoneTemplateId}', () => {
    const body = {
      param: {
        name: 'milestoneTemplate 1-updated',
        description: 'description-updated',
        duration: 6,
        type: 'type1-updated',
        order: 5,
        plannedText: 'text to be shown in planned stage',
        blockedText: 'text to be shown in blocked stage',
        activeText: 'text to be shown in active stage',
        completedText: 'text to be shown in completed stage',
      },
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed product template', (done) => {
      request(server)
        .patch('/v4/productTemplates/122/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 404 for non-existed milestone template', (done) => {
      request(server)
        .patch('/v4/productTemplates/1/milestones/111')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 404 for deleted milestone template', (done) => {
      request(server)
        .patch('/v4/productTemplates/1/milestones/4')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.id.should.be.eql(1);
          resJson.name.should.be.eql(body.param.name);
          resJson.description.should.be.eql(body.param.description);
          resJson.duration.should.be.eql(body.param.duration);
          resJson.type.should.be.eql(body.param.type);
          resJson.order.should.be.eql(body.param.order);
          resJson.plannedText.should.be.eql(body.param.plannedText);
          resJson.blockedText.should.be.eql(body.param.blockedText);
          resJson.activeText.should.be.eql(body.param.activeText);
          resJson.completedText.should.be.eql(body.param.completedText);

          should.exist(resJson.createdBy);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - order increases and replaces another milestone\'s order', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ param: _.assign({}, body.param, { order: 3 }) }) // 1 to 3
        .expect(200)
        .end(() => {
          // Milestone 1: order 3
          // Milestone 2: order 2 - 1 = 1
          // Milestone 3: order 3 - 1 = 2
          setTimeout(() => {
            models.ProductMilestoneTemplate.findById(1)
              .then((milestone) => {
                milestone.order.should.be.eql(3);
              })
              .then(() => models.ProductMilestoneTemplate.findById(2))
              .then((milestone) => {
                milestone.order.should.be.eql(1);
              })
              .then(() => models.ProductMilestoneTemplate.findById(3))
              .then((milestone) => {
                milestone.order.should.be.eql(2);

                done();
              });
          }, 3000);
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - order increases and doesnot replace another milestone\'s order', function (done) {
      this.timeout(10000);

      request(server)
      .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ param: _.assign({}, body.param, { order: 4 }) }) // 1 to 4
        .expect(200)
        .end(() => {
          // Milestone 1: order 4
          // Milestone 2: order 2
          // Milestone 3: order 3
          setTimeout(() => {
            models.ProductMilestoneTemplate.findById(1)
              .then((milestone) => {
                milestone.order.should.be.eql(4);
              })
              .then(() => models.ProductMilestoneTemplate.findById(2))
              .then((milestone) => {
                milestone.order.should.be.eql(2);
              })
              .then(() => models.ProductMilestoneTemplate.findById(3))
              .then((milestone) => {
                milestone.order.should.be.eql(3);

                done();
              });
          }, 3000);
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - order decreases and replaces another milestone\'s order', function (done) {
      this.timeout(10000);

      request(server)
      .patch('/v4/productTemplates/1/milestones/3')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ param: _.assign({}, body.param, { order: 1 }) }) // 3 to 1
        .expect(200)
        .end(() => {
          // Milestone 1: order 2
          // Milestone 2: order 3
          // Milestone 3: order 1
          setTimeout(() => {
            models.ProductMilestoneTemplate.findById(1)
              .then((milestone) => {
                milestone.order.should.be.eql(2);
              })
              .then(() => models.ProductMilestoneTemplate.findById(2))
              .then((milestone) => {
                milestone.order.should.be.eql(3);
              })
              .then(() => models.ProductMilestoneTemplate.findById(3))
              .then((milestone) => {
                milestone.order.should.be.eql(1);

                done();
              });
          }, 3000);
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - order decreases and doesnot replace another milestone\'s order', function (done) {
      this.timeout(10000);

      request(server)
      .patch('/v4/productTemplates/1/milestones/3')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ param: _.assign({}, body.param, { order: 0 }) }) // 3 to 0
        .expect(200)
        .end(() => {
          // Milestone 1: order 1
          // Milestone 2: order 2
          // Milestone 3: order 0
          setTimeout(() => {
            models.ProductMilestoneTemplate.findById(1)
              .then((milestone) => {
                milestone.order.should.be.eql(1);
              })
              .then(() => models.ProductMilestoneTemplate.findById(2))
              .then((milestone) => {
                milestone.order.should.be.eql(2);
              })
              .then(() => models.ProductMilestoneTemplate.findById(3))
              .then((milestone) => {
                milestone.order.should.be.eql(0);

                done();
              });
          }, 3000);
        });
    });

    it('should return 200 for missing name', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.name;
      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing type', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.type;
      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing duration', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.duration;
      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing order', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.order;
      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing plannedText', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.plannedText;
      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing blockedText', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.blockedText;
      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing activeText', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.activeText;
      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing completedText', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.completedText;
      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });
  });
});
