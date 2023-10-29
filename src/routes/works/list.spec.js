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

describe('LIST works', () => {
  const phases = [
    {
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
    },
    {
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
    },
  ];

  const productBody = {
    name: 'test phase product',
    type: 'product1',
    estimatedPrice: 20.0,
    actualPrice: 1.23456,
    details: {
      message: 'This can be any json',
    },
    createdBy: 1,
    updatedBy: 1,
  };


  let projectId;
  let workStreamId;

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
                  models.ProjectPhase.bulkCreate(_.map(phases, p => _.assign(p, { projectId })),
                    { returning: true })
                    .then((p) => {
                      models.PhaseWorkStream.bulkCreate([{
                        phaseId: p[0].id,
                        workStreamId,
                      }, {
                        phaseId: p[1].id,
                        workStreamId,
                      }]).then((ws) => {
                        _.assign(productBody, { phaseId: ws[0].phaseId, projectId });

                        models.PhaseProduct.create(productBody).then(() => {
                          done();
                        });
                      });
                    });
                });
              });
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/{projectId}/workstreams/{workStreamId}/works', () => {
    it('should return 200 for admin', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const phase = phases[0];

          const resJson = res.body;
          resJson.should.have.length(2);
          resJson[0].name.should.be.eql(phase.name);
          resJson[0].status.should.be.eql(phase.status);
          resJson[0].budget.should.be.eql(phase.budget);
          resJson[0].progress.should.be.eql(phase.progress);
          resJson[0].details.should.be.eql(phase.details);
          should.exist(resJson[0].createdAt);
          resJson[0].updatedBy.should.be.eql(phase.updatedBy);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);

          done();
        });
    });

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works`)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return with populated workItems if fields=workItems is used', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works?fields=workItems`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(2);
          resJson[0].should.have.property('workItems');
          resJson[0].workItems.should.be.a('array');
          resJson[0].workItems.should.have.lengthOf(1);
          resJson[0].workItems[0].should.have.property('projectId');
          resJson[0].workItems[0].projectId.should.equal(projectId);
          resJson[0].workItems[0].name.should.equal(productBody.name);
          resJson[1].should.have.property('workItems');
          resJson[1].workItems.should.be.a('array');
          resJson[1].workItems.should.have.lengthOf(0);
          done();
        });
    });
  });
});
