/**
 * Tests for list.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

const projectTemplates = [
  {
    name: 'template 1',
    key: 'key 1',
    category: 'category 1',
    icon: 'http://example.com/icon1.ico',
    question: 'question 1',
    info: 'info 1',
    aliases: ['key-1', 'key_1'],
    scope: {},
    phases: {},
    createdBy: 1,
    updatedBy: 1,
  },
];
const productTemplates = [
  {
    name: 'name 1',
    productKey: 'productKey 1',
    category: 'category',
    subCategory: 'category',
    icon: 'http://example.com/icon1.ico',
    brief: 'brief 1',
    details: 'details 1',
    aliases: {},
    template: {},
    createdBy: 1,
    updatedBy: 2,
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
    reference: 'product',
    referenceId: 1,
    metadata: {},
    createdBy: 1,
    updatedBy: 2,
  },
];
const projectTypes = [
  {
    key: 'key1',
    displayName: 'displayName 1',
    icon: 'http://example.com/icon1.ico',
    question: 'question 1',
    info: 'info 1',
    aliases: ['key-1', 'key_1'],
    metadata: { 'slack-notification-mappings': { color: '#96d957', label: 'Full App' } },
    createdBy: 1,
    updatedBy: 1,
  },
];
const productCategories = [
  {
    key: 'key1',
    displayName: 'displayName 1',
    icon: 'http://example.com/icon1.ico',
    question: 'question 1',
    info: 'info 1',
    aliases: ['key-1', 'key_1'],
    createdBy: 1,
    updatedBy: 1,
  },
];

describe('GET all metadata', () => {
  beforeEach(() => testUtil.clearDb()
    .then(() => models.ProjectTemplate.bulkCreate(projectTemplates))
    .then(() => models.ProductTemplate.bulkCreate(productTemplates))
    .then(() => models.MilestoneTemplate.bulkCreate(milestoneTemplates))
    .then(() => models.ProjectType.bulkCreate(projectTypes))
    .then(() => models.ProductCategory.bulkCreate(productCategories)),
  );
  after(testUtil.clearDb);

  describe('GET /projects/metadata', () => {
    it('should return 200 even if user is not authenticated', (done) => {
      request(server)
        .get('/v4/projects/metadata')
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          should.exist(resJson);
          resJson.projectTemplates.should.have.length(1);
          resJson.productTemplates.should.have.length(1);
          resJson.milestoneTemplates.should.have.length(1);
          resJson.projectTypes.should.have.length(1);
          resJson.productCategories.should.have.length(1);

          done();
        });
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v4/projects/metadata')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v4/projects/metadata')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get('/v4/projects/metadata')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get('/v4/projects/metadata')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get('/v4/projects/metadata')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });
  });
});
