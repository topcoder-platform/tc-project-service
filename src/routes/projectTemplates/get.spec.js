/**
 * Tests for get.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('GET project template', () => {
  const template = {
    name: 'template 1',
    key: 'key 1',
    category: 'category 1',
    icon: 'http://example.com/icon1.ico',
    question: 'question 1',
    info: 'info 1',
    aliases: ['key-1', 'key_1'],
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
  };

  let templateId;

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.ProjectTemplate.create(template).then((createdTemplate) => {
        templateId = createdTemplate.id;
        done();
      }));
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/metadata/projectTemplates/{templateId}', () => {
    it('should return 404 for non-existed template', (done) => {
      request(server)
        .get('/v5/projects/metadata/projectTemplates/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted template', (done) => {
      models.ProjectTemplate.destroy({ where: { id: templateId } })
        .then(() => {
          request(server)
            .get(`/v5/projects/metadata/projectTemplates/${templateId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get(`/v5/projects/metadata/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.id.should.be.eql(templateId);
          resJson.name.should.be.eql(template.name);
          resJson.key.should.be.eql(template.key);
          resJson.category.should.be.eql(template.category);
          resJson.scope.should.be.eql(template.scope);
          resJson.phases.should.be.eql(template.phases);
          resJson.createdBy.should.be.eql(template.createdBy);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(template.updatedBy);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get(`/v5/projects/metadata/projectTemplates/${templateId}`)
        .expect(403, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get(`/v5/projects/metadata/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get(`/v5/projects/metadata/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get(`/v5/projects/metadata/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get(`/v5/projects/metadata/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });
  });
});
