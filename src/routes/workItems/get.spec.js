/**
 * Tests for get.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';
import server from '../../app';
import models from '../../models';
import testUtil from '../../tests/util';

const should = chai.should();

const body = {
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

describe('GET Work Item', () => {
  let projectId;
  let workStreamId;
  let workId;
  let productId;

  const memberUser = {
    handle: testUtil.getDecodedToken(testUtil.jwts.member).handle,
    userId: testUtil.getDecodedToken(testUtil.jwts.member).userId,
    firstName: 'fname',
    lastName: 'lName',
    email: 'some@abc.com',
  };
  const copilotUser = {
    handle: testUtil.getDecodedToken(testUtil.jwts.copilot).handle,
    userId: testUtil.getDecodedToken(testUtil.jwts.copilot).userId,
    firstName: 'fname',
    lastName: 'lName',
    email: 'some@abc.com',
  };

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
                // create members
                models.ProjectMember.bulkCreate([{
                  id: 1,
                  userId: copilotUser.userId,
                  projectId,
                  role: 'copilot',
                  isPrimary: false,
                  createdBy: 1,
                  updatedBy: 1,
                }, {
                  id: 2,
                  userId: memberUser.userId,
                  projectId,
                  role: 'customer',
                  isPrimary: true,
                  createdBy: 1,
                  updatedBy: 1,
                }])
                  .then(() => {
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
                        })
                          .then(() => {
                            _.assign(body, { phaseId: workId, projectId });
                            models.PhaseProduct.create(body).then((product) => {
                              productId = product.id;
                              done();
                            });
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

  describe('GET /projects/{projectId}/workstreams/{workStreamId}/works/{workId}/workitems/{productId}', () => {
    it('should return 403 when user have no permission (non team member)', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}/workitems/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 404 when no project with specific projectId', (done) => {
      request(server)
        .get(`/v5/projects/9999/workstreams/${workStreamId}/works/${workId}/workitems/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no work stream with specific workStreamId', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/999/works/${workId}/workitems/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no work with specific workId', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/999/workitems/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 1 phase when user have project permission (customer)', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}/workitems/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.name.should.be.eql(body.name);
            resJson.type.should.be.eql(body.type);
            resJson.estimatedPrice.should.be.eql(body.estimatedPrice);
            resJson.actualPrice.should.be.eql(body.actualPrice);
            resJson.details.should.be.eql(body.details);
            done();
          }
        });
    });

    it('should return 1 phase when user have project permission (copilot)', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}/workitems/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.name.should.be.eql(body.name);
            resJson.type.should.be.eql(body.type);
            resJson.estimatedPrice.should.be.eql(body.estimatedPrice);
            resJson.actualPrice.should.be.eql(body.actualPrice);
            resJson.details.should.be.eql(body.details);
            done();
          }
        });
    });
  });
});
