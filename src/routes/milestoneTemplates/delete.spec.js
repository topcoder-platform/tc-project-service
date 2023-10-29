/**
 * Tests for delete.js
 */
import request from 'supertest';
import chai from 'chai';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const expectAfterDelete = (id, err, next) => {
  if (err) throw err;
  setTimeout(() => {
    models.MilestoneTemplate.findOne({
      where: {
        id,
      },
      paranoid: false,
    })
      .then((res) => {
        server.logger.error(`res = ${res}`);
        if (!res) {
          throw new Error('Should found the entity');
        } else {
          chai.assert.isNotNull(res.deletedAt);
          chai.assert.isNotNull(res.deletedBy);

          request(server)
            .get(`/v5/timelines/metadata/milestoneTemplates/${id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, next);
        }
      });
  }, 500);
};
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
    deletedAt: new Date(),
  },
];

describe('DELETE milestone template', () => {
  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.ProductTemplate.bulkCreate(productTemplates))
      .then(() => { models.MilestoneTemplate.bulkCreate(milestoneTemplates).then(() => done()); });
  },
  );
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('DELETE /timelines/metadata/milestoneTemplates/{milestoneTemplateId}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .delete('/v5/timelines/metadata/milestoneTemplates/1')
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .delete('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .delete('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .delete('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed milestone template', (done) => {
      request(server)
        .delete('/v5/timelines/metadata/milestoneTemplates/444')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted milestone template', (done) => {
      request(server)
        .delete('/v5/timelines/metadata/milestoneTemplates/2')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 400 for invalid milestoneTemplateId param', (done) => {
      request(server)
        .delete('/v5/timelines/metadata/milestoneTemplates/0')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(400, done);
    });

    it('should return 204, for admin, if template was successfully removed', (done) => {
      request(server)
        .delete('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(1, err, done));
    });

    it('should return 204, for connect admin, if template was successfully removed', (done) => {
      request(server)
        .delete('/v5/timelines/metadata/milestoneTemplates/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(1, err, done));
    });
  });
});
