/**
 * Tests for list.js
 */
import chai from 'chai';
import request from 'supertest';
import _ from 'lodash';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

const project = {
  id: 1,
  name: 'test project 1',
  type: 'generic',
  status: 'active',
  createdBy: 1,
  updatedBy: 1,
  lastActivityAt: new Date(),
  lastActivityUserId: 1,
};

const projectMembers = [
  {
    userId: testUtil.userIds.admin,
    role: 'manager',
    projectId: 1,
    createdBy: 1,
    updatedBy: 1,
  },
  {
    userId: testUtil.userIds.copilot,
    role: 'copilot',
    projectId: 1,
    createdBy: 1,
    updatedBy: 1,
  },
  {
    userId: testUtil.userIds.member,
    role: 'manager',
    projectId: 1,
    createdBy: 1,
    updatedBy: 1,
  },
];

const projectEstimations = [
  {
    id: 1,
    buildingBlockKey: 'key1',
    conditions: ' empty condition ',
    price: 1000,
    quantity: 100,
    minTime: 2,
    maxTime: 2,
    metadata: {},
    projectId: 1,
    createdBy: 1,
    updatedBy: 1,
  },
];

const projectEstimationItems = [
  {
    projectEstimationId: 1,
    price: 1234,
    type: 'community',
    markupUsedReference: 'buildingBlock',
    markupUsedReferenceId: 1,
    createdBy: 1,
    updatedBy: 1,
  },
  {
    projectEstimationId: 1,
    price: 5678,
    type: 'topcoder_service',
    markupUsedReference: 'buildingBlock',
    markupUsedReferenceId: 1,
    createdBy: 1,
    updatedBy: 1,
  },
  {
    projectEstimationId: 1,
    price: 1982,
    type: 'fee',
    markupUsedReference: 'buildingBlock',
    markupUsedReferenceId: 1,
    createdBy: 1,
    updatedBy: 1,
  },
];

describe('GET project estimation items', () => {
  beforeEach(() => testUtil.clearDb()
    .then(() => models.Project.create(project))
    .then(() => models.ProjectMember.bulkCreate(projectMembers))
    .then(() => models.ProjectEstimation.bulkCreate(projectEstimations))
    .then(() => models.ProjectEstimationItem.bulkCreate(projectEstimationItems))
    .then(() => Promise.resolve()),
  );
  after((done) => {
    testUtil.clearDb(done);
  });

  const url = '/v5/projects/1/estimations/1/items';

  describe(`GET ${url}`, () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get(url)
        .expect(403)
        .end(done);
    });

    it('should return 403 if user is not copilot or above', (done) => {
      request(server)
        .get(url)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect(403)
        .end(done);
    });

    it('should return 404 if project not exists', (done) => {
      request(server)
        .get('/v5/projects/999/estimations/1/items')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404)
        .end(done);
    });

    it('should return 404 if project estimation not exists', (done) => {
      request(server)
        .get('/v5/projects/1/estimations/999/items')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404)
        .end(done);
    });

    it('should return all project estimation items for admin', (done) => {
      request(server)
        .get(url)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.length.should.be.eql(3);
            // convert items to map with type.
            const itemMap = {};
            _.forEach(resJson, (item) => {
              itemMap[item.type] = item;
            });
            should.exist(itemMap.community);
            itemMap.community.price.should.be.eql(1234);
            itemMap.community.projectEstimationId.should.be.eql(1);
            itemMap.community.type.should.be.eql('community');

            should.exist(itemMap.topcoder_service);
            itemMap.topcoder_service.price.should.be.eql(5678);
            itemMap.topcoder_service.projectEstimationId.should.be.eql(1);
            itemMap.topcoder_service.type.should.be.eql('topcoder_service');

            should.exist(itemMap.fee);
            itemMap.fee.price.should.be.eql(1982);
            itemMap.fee.projectEstimationId.should.be.eql(1);
            itemMap.fee.type.should.be.eql('fee');

            done();
          }
        });
    });

    it('should return 1 project estimation item for copilot', (done) => {
      request(server)
        .get(url)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.length.should.be.eql(1);
            // convert items to map with type.
            should.exist(resJson[0]);

            const item = resJson[0];

            item.price.should.be.eql(1234);
            item.projectEstimationId.should.be.eql(1);
            item.type.should.be.eql('community');

            done();
          }
        });
    });

    it('should return 0 project estimation items for a project manager who is not a topcoder manager', (done) => {
      request(server)
        .get(url)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.length.should.be.eql(0);
            // convert items to map with type.
            done();
          }
        });
    });
  });
});
