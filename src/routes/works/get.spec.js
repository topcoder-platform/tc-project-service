/**
 * Tests for get.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('GET work', () => {
  const body = {
    name: 'test project phase',
    status: 'active',
    startDate: '2018-05-15T00:00:00Z',
    endDate: '2018-05-15T12:00:00Z',
    budget: 20.0,
    progress: 1.23456,
    details: {
      message: 'This can be any json',
    },
    createdBy: 1,
    updatedBy: 1,
  };

  let projectId;
  let workStreamId;
  let workId;

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
                models.WorkStream.create({
                  name: 'Work Stream',
                  type: 'generic',
                  status: 'active',
                  projectId,
                  createdBy: 1,
                  updatedBy: 1,
                }).then((entity) => {
                  workStreamId = entity.id;
                  models.ProjectPhase.create({
                    name: 'test project phase',
                    status: 'active',
                    startDate: '2018-05-15T00:00:00Z',
                    endDate: '2018-05-15T12:00:00Z',
                    budget: 20.0,
                    progress: 1.23456,
                    details: {
                      message: 'This can be any json',
                    },
                    createdBy: 1,
                    updatedBy: 1,
                    projectId,
                  }).then((phase) => {
                    workId = phase.id;
                    models.PhaseWorkStream.create({
                      phaseId: workId,
                      workStreamId,
                    }).then(() => done());
                  });
                });
              });
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/{projectId}/workstreams/{workStreamId}/works/{workId}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 404 when no project with specific projectId', (done) => {
      request(server)
        .get(`/v5/projects/9999/workstreams/${workStreamId}/works/${workId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no work stream with specific workStreamId', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/999/works/${workId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no work with specific workId', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/999`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 for deleted type', (done) => {
      models.ProjectPhase.destroy({ where: { id: workId } })
        .then(() => {
          request(server)
            .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.name.should.be.eql(body.name);
          resJson.status.should.be.eql(body.status);
          resJson.budget.should.be.eql(body.budget);
          resJson.progress.should.be.eql(body.progress);
          resJson.details.should.be.eql(body.details);
          resJson.createdBy.should.be.eql(body.createdBy);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(body.updatedBy);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });
  });
});
