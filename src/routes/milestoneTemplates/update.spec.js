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
  },
  {
    id: 4,
    name: 'milestoneTemplate 4',
    duration: 5,
    type: 'type4',
    order: 4,
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

    it('should return 422 for missing name', (done) => {
      const invalidBody = {
        param: {
          name: undefined,
        },
      };

      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect(422, done);
    });

    it('should return 422 for missing type', (done) => {
      const invalidBody = {
        param: {
          type: undefined,
        },
      };

      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect(422, done);
    });

    it('should return 422 for missing duration', (done) => {
      const invalidBody = {
        param: {
          duration: undefined,
        },
      };

      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect(422, done);
    });

    it('should return 422 for missing order', (done) => {
      const invalidBody = {
        param: {
          order: undefined,
        },
      };

      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect(422, done);
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

    it('should return 200 for connect manager', (done) => {
      request(server)
        .patch('/v4/productTemplates/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });
  });
});
