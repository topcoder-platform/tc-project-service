/**
 * Tests for list.js
 */
import chai from 'chai';
import _ from 'lodash';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('LIST work streams', () => {
  const workStreams = [{
    name: 'Work Stream 1',
    type: 'generic',
    status: 'active',
    createdBy: 1,
    updatedBy: 1,
  }, {
    name: 'Work Stream 2',
    type: 'generic',
    status: 'reviewed',
    createdBy: 1,
    updatedBy: 1,
  }];

  let projectId;

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => {
        models.ProjectTemplate.create({
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
        })
          .then((template) => {
            // Create projects
            models.Project.create({
              type: 'generic',
              billingAccountId: 1,
              name: 'test1',
              description: 'test project1',
              status: 'draft',
              templateId: template.id,
              details: {},
              createdBy: 1,
              updatedBy: 1,
              lastActivityAt: 1,
              lastActivityUserId: '1',
            })
              .then((project) => {
                projectId = project.id;
                models.WorkStream.bulkCreate(_.map(workStreams, w => _.assign(w, { projectId }))).then(() => done());
              });
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/{projectId}/workstreams', () => {
    it('should return 200 for admin', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const workStream = workStreams[0];

          const resJson = res.body;
          resJson.should.have.length(2);
          resJson[0].name.should.be.eql(workStream.name);
          resJson[0].type.should.be.eql(workStream.type);
          resJson[0].status.should.be.eql(workStream.status);
          resJson[0].projectId.should.be.eql(workStream.projectId);
          should.exist(resJson[0].createdAt);
          resJson[0].updatedBy.should.be.eql(workStream.updatedBy);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);

          done();
        });
    });

    it('should return 404 for deleted project', (done) => {
      models.Project.destroy({ where: { id: projectId } })
        .then(() => {
          request(server)
            .get(`/v5/projects/${projectId}/workstreams`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams`)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });
  });
});
