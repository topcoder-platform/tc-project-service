/**
 * Tests for list.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('LIST project templates', () => {
  const templates = [
    {
      name: 'template 1',
      key: 'key 1',
      category: 'category 1',
      icon: 'http://example.com/icon1.ico',
      question: 'question 1',
      info: 'info 1',
      aliases: ['key-1', 'key_1'],
      disabled: false,
      hidden: true,
      scope: {
        scope1: {
          subScope1A: 1,
          subScope1B: 2,
        },
        scope2: [1, 2, 3],
      },
      phases: {
        phase1: {
          name: 'phase 1',
          details: {
            anyDetails: 'any details 1',
          },
          others: ['others 11', 'others 12'],
        },
        phase2: {
          name: 'phase 2',
          details: {
            anyDetails: 'any details 2',
          },
          others: ['others 21', 'others 22'],
        },
      },
      createdBy: 1,
      updatedBy: 1,
    },
    {
      name: 'template 2',
      key: 'key 2',
      category: 'category 2',
      icon: 'http://example.com/icon1.ico',
      question: 'question 2',
      info: 'info 2',
      aliases: ['key-2', 'key_2'],
      scope: {},
      phases: {},
      createdBy: 1,
      updatedBy: 2,
    },
  ];

  let templateId;

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.ProjectTemplate.create(templates[0]))
      .then((createdTemplate) => {
        templateId = createdTemplate.id;
        return models.ProjectTemplate.create(templates[1]).then(() => done());
      });
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/metadata/projectTemplates', () => {
    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v5/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const template = templates[0];

          const resJson = res.body;
          resJson.should.have.length(2);
          resJson[0].id.should.be.eql(templateId);
          resJson[0].name.should.be.eql(template.name);
          resJson[0].key.should.be.eql(template.key);
          resJson[0].category.should.be.eql(template.category);
          resJson[0].scope.should.be.eql(template.scope);
          resJson[0].phases.should.be.eql(template.phases);
          resJson[0].createdBy.should.be.eql(template.createdBy);
          should.exist(resJson[0].createdAt);
          resJson[0].updatedBy.should.be.eql(template.updatedBy);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);

          done();
        });
    });

    it('should return 403 for anonymous user', (done) => {
      request(server)
        .get('/v5/projects/metadata/projectTemplates')
        .expect(403, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get('/v5/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get('/v5/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get('/v5/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get('/v5/projects/metadata/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });
  });
});
