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
    reference: 'productTemplate',
    referenceId: 1,
    metadata: {},
    createdBy: 2,
    updatedBy: 3,
    deletedAt: new Date(),
  },
  {
    id: 5,
    name: 'milestoneTemplate 5',
    duration: 5,
    type: 'type5',
    order: 5,
    plannedText: 'text to be shown in planned stage - 5',
    blockedText: 'text to be shown in blocked stage - 5',
    activeText: 'text to be shown in active stage - 5',
    completedText: 'text to be shown in completed stage - 5',
    reference: 'productTemplate',
    referenceId: 1,
    metadata: {
      metadata1: {
        name: 'metadata 1',
        details: {
          anyDetails: 'any details 1',
        },
        others: ['others 11', 'others 12'],
      },
      metadata2: {
        name: 'metadata 2',
        details: {
          anyDetails: 'any details 2',
        },
        others: ['others 21', 'others 22'],
      },
    },
    createdBy: 2,
    updatedBy: 3,
  },
];

describe('UPDATE milestone template', () => {
  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.ProductTemplate.bulkCreate(productTemplates))
      .then(() => { models.MilestoneTemplate.bulkCreate(milestoneTemplates).then(() => done()); });
  },
  );
  after((done) => {
    testUtil.clearDb(done);
  });


  describe('PATCH /timelines/metadata/milestoneTemplates/{milestoneTemplateId}', () => {
    const body = {
      name: 'milestoneTemplate 1-updated',
      description: 'description-updated',
      duration: 6,
      type: 'type1-updated',
      order: 5,
      plannedText: 'text to be shown in planned stage',
      blockedText: 'text to be shown in blocked stage',
      activeText: 'text to be shown in active stage',
      completedText: 'text to be shown in completed stage',
      hidden: true,
      reference: 'productTemplate',
      referenceId: 1,
      metadata: {},
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed milestone template', (done) => {
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/111')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 404 for deleted milestone template', (done) => {
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/4')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.id.should.be.eql(1);
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
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(_.assign({}, body, { order: 3 })) // 1 to 3
        .expect(200)
        .end(() => {
          // Milestone 1: order 3
          // Milestone 2: order 2 - 1 = 1
          // Milestone 3: order 3 - 1 = 2
          models.MilestoneTemplate.findByPk(1)
            .then((milestone) => {
              milestone.order.should.be.eql(3);
            })
            .then(() => models.MilestoneTemplate.findByPk(2))
            .then((milestone) => {
              milestone.order.should.be.eql(1);
            })
            .then(() => models.MilestoneTemplate.findByPk(3))
            .then((milestone) => {
              milestone.order.should.be.eql(2);

              done();
            });
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - order increases and doesnot replace another milestone\'s order', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(_.assign({}, body, { order: 4 })) // 1 to 4
        .expect(200)
        .end(() => {
          // Milestone 1: order 4
          // Milestone 2: order 2
          // Milestone 3: order 3
          models.MilestoneTemplate.findByPk(1)
            .then((milestone) => {
              milestone.order.should.be.eql(4);
            })
            .then(() => models.MilestoneTemplate.findByPk(2))
            .then((milestone) => {
              milestone.order.should.be.eql(2);
            })
            .then(() => models.MilestoneTemplate.findByPk(3))
            .then((milestone) => {
              milestone.order.should.be.eql(3);

              done();
            });
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - order decreases and replaces another milestone\'s order', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/3')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(_.assign({}, body, { order: 1 })) // 3 to 1
        .expect(200)
        .end(() => {
          // Milestone 1: order 2
          // Milestone 2: order 3
          // Milestone 3: order 1
          models.MilestoneTemplate.findByPk(1)
            .then((milestone) => {
              milestone.order.should.be.eql(2);
            })
            .then(() => models.MilestoneTemplate.findByPk(2))
            .then((milestone) => {
              milestone.order.should.be.eql(3);
            })
            .then(() => models.MilestoneTemplate.findByPk(3))
            .then((milestone) => {
              milestone.order.should.be.eql(1);

              done();
            });
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - order decreases and doesnot replace another milestone\'s order', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/3')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(_.assign({}, body, { order: 0 })) // 3 to 0
        .expect(200)
        .end(() => {
          // Milestone 1: order 1
          // Milestone 2: order 2
          // Milestone 3: order 0
          models.MilestoneTemplate.findByPk(1)
            .then((milestone) => {
              milestone.order.should.be.eql(1);
            })
            .then(() => models.MilestoneTemplate.findByPk(2))
            .then((milestone) => {
              milestone.order.should.be.eql(2);
            })
            .then(() => models.MilestoneTemplate.findByPk(3))
            .then((milestone) => {
              milestone.order.should.be.eql(0);

              done();
            });
        });
    });

    it('should return 200 for missing name', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.name;
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing type', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.type;
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing duration', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.duration;
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing order', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.order;
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing plannedText', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.plannedText;
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing blockedText', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.blockedText;
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing activeText', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.activeText;
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing completedText', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.completedText;
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing hidden field', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.hidden;
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });

    it('should return 200 for admin - updating metadata', (done) => {
      const bodyWithMetadata = {
        name: 'milestoneTemplate 5-updated',
        description: 'description-updated',
        duration: 6,
        type: 'type5-updated',
        order: 5,
        plannedText: 'text to be shown in planned stage',
        blockedText: 'text to be shown in blocked stage',
        activeText: 'text to be shown in active stage',
        completedText: 'text to be shown in completed stage',
        hidden: true,
        reference: 'productTemplate',
        referenceId: 1,
        metadata: {
          metadata1: {
            name: 'metadata 1 - update',
            details: {
              anyDetails: 'any details 1 - update',
              newDetails: 'new',
            },
            others: ['others new'],
          },
          metadata3: {
            name: 'metadata 3',
            details: {
              anyDetails: 'any details 3',
            },
            others: ['others 31', 'others 32'],
          },
        },
      };

      request(server)
        .patch('/v5/timelines/metadata/milestoneTemplates/5')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(bodyWithMetadata)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.metadata.should.be.eql({
            metadata1: {
              name: 'metadata 1 - update',
              details: {
                anyDetails: 'any details 1 - update',
                newDetails: 'new',
              },
              others: ['others new'],
            },
            metadata2: {
              name: 'metadata 2',
              details: {
                anyDetails: 'any details 2',
              },
              others: ['others 21', 'others 22'],
            },
            metadata3: {
              name: 'metadata 3',
              details: {
                anyDetails: 'any details 3',
              },
              others: ['others 31', 'others 32'],
            },
          });

          done();
        });
    });
  });
});
