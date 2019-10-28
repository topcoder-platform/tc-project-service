/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import chai from 'chai';
import sinon from 'sinon';
import config from 'config';
import request from 'supertest';
import server from '../../app';
import models from '../../models';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import messageService from '../../services/messageService';
import RabbitMQService from '../../services/rabbitmq';
import mockRabbitMQ from '../../tests/mockRabbitMQ';
import {
  BUS_API_EVENT, RESOURCES, CONNECT_NOTIFICATION_EVENT,
} from '../../constants';

const should = chai.should();

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

const body = {
  name: 'test project phase',
  description: 'test project phase description',
  requirements: 'test project phase requirements',
  status: 'active',
  startDate: '2018-05-15T00:00:00Z',
  endDate: '2018-05-15T12:00:00Z',
  budget: 20.0,
  progress: 1.23456,
  spentBudget: 10.0,
  duration: 10,
  details: {
    message: 'This can be any json',
  },
};

const validatePhase = (resJson, expectedPhase) => {
  should.exist(resJson);
  resJson.name.should.be.eql(expectedPhase.name);
  resJson.description.should.be.eql(expectedPhase.description);
  resJson.requirements.should.be.eql(expectedPhase.requirements);
  resJson.status.should.be.eql(expectedPhase.status);
  resJson.budget.should.be.eql(expectedPhase.budget);
  resJson.progress.should.be.eql(expectedPhase.progress);
  resJson.details.should.be.eql(expectedPhase.details);
};

describe('Project Phases', () => {
  let projectId;
  let projectName;
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
  const project = {
    type: 'generic',
    billingAccountId: 1,
    name: 'test1',
    description: 'test project1',
    status: 'draft',
    details: {},
    createdBy: 1,
    updatedBy: 1,
    lastActivityAt: 1,
    lastActivityUserId: '1',
  };
  let productTemplateId;
  beforeEach((done) => {
    // mocks
    testUtil.clearDb()
      .then(() => models.Project.create(project).then((p) => {
        projectId = p.id;
        projectName = p.name;
        // create members
        return models.ProjectMember.bulkCreate([{
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
        }]);
      }))
      .then(() =>
        models.ProductTemplate.create({
          name: 'name 1',
          productKey: 'productKey 1',
          category: 'generic',
          subCategory: 'generic',
          icon: 'http://example.com/icon1.ico',
          brief: 'brief 1',
          details: 'details 1',
          aliases: ['product key 1', 'product_key_1'],
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
        }).then((template) => {
          productTemplateId = template.id;
          return Promise.resolve();
        }),
      )
      .then(() => done());
  });

  afterEach((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects/{id}/phases/', () => {
    it('should return 403 if user does not have permissions (non team member)', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 403 if user does not have permissions (customer)', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 400 when name not provided', (done) => {
      const reqBody = _.cloneDeep(body);
      delete reqBody.name;
      request(server)
        .post(`/v5/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(reqBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 when status not provided', (done) => {
      const reqBody = _.cloneDeep(body);
      delete reqBody.status;
      request(server)
        .post(`/v5/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(reqBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 when startDate > endDate', (done) => {
      const reqBody = _.cloneDeep(body);
      reqBody.startDate = '2018-05-16T12:00:00';
      request(server)
        .post(`/v5/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(reqBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 when budget is negative', (done) => {
      const reqBody = _.cloneDeep(body);
      reqBody.budget = -20;
      request(server)
        .post(`/v5/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(reqBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 when progress is negative', (done) => {
      const reqBody = _.cloneDeep(body);
      reqBody.progress = -20;
      request(server)
        .post(`/v5/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(reqBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 404 when project is not found', (done) => {
      request(server)
        .post('/v5/projects/99999/phases/')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 201 if payload is valid', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            validatePhase(resJson, body);
            done();
          }
        });
    });

    it('should return 201 if payload is valid (0 for non negative numbers)', (done) => {
      const bodyWithZeros = _.cloneDeep(body);
      bodyWithZeros.duration = 0;
      bodyWithZeros.spentBudget = 0.0;
      bodyWithZeros.budget = 0.0;
      bodyWithZeros.progress = 0.0;
      request(server)
        .post(`/v5/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(bodyWithZeros)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            validatePhase(resJson, bodyWithZeros);
            done();
          }
        });
    });

    it('should return 201 if payload has order specified', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(_.assign({ order: 1 }, body))
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            validatePhase(resJson, body);
            resJson.order.should.be.eql(1);

            const firstPhaseId = resJson.id;

            // Create second phase
            request(server)
              .post(`/v5/projects/${projectId}/phases/`)
              .set({
                Authorization: `Bearer ${testUtil.jwts.copilot}`,
              })
              .send(_.assign({ order: 1 }, body))
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err2, res2) => {
                const resJson2 = res2.body;
                validatePhase(resJson2, body);
                resJson2.order.should.be.eql(1);

                models.ProjectPhase.findOne({ where: { id: firstPhaseId } })
                  .then((firstPhase) => {
                    firstPhase.order.should.be.eql(2);
                    done();
                  });
              });
          }
        });
    });

    it('should return 201 if payload has productTemplateId specified', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(_.assign({ productTemplateId }, body))
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            validatePhase(resJson, body);
            resJson.products.should.have.length(1);

            resJson.products[0].name.should.be.eql('name 1');
            resJson.products[0].templateId.should.be.eql(1);
            resJson.products[0].type.should.be.eql('productKey 1');
            resJson.products[0].projectId.should.be.eql(1);
            resJson.products[0].phaseId.should.be.eql(resJson.id);

            done();
          }
        });
    });

    it('should return 201 if requested by admin', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end(done);
    });

    it('should return 201 if requested by manager which is a member', (done) => {
      models.ProjectMember.create({
        id: 3,
        userId: testUtil.userIds.manager,
        projectId,
        role: 'manager',
        isPrimary: false,
        createdBy: 1,
        updatedBy: 1,
      }).then(() => {
        request(server)
          .post(`/v5/projects/${projectId}/phases/`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.manager}`,
          })
          .send(body)
          .expect('Content-Type', /json/)
          .expect(201)
          .end(done);
      });
    });

    it('should return 403 if requested by manager which is not a member', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(403)
        .end(done);
    });

    it('should return 403 if requested by non-member copilot', (done) => {
      models.ProjectMember.destroy({
        where: { userId: testUtil.userIds.copilot, projectId },
      }).then(() => {
        request(server)
          .post(`/v5/projects/${projectId}/phases/`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send(body)
          .expect('Content-Type', /json/)
          .expect(403)
          .end(done);
      });
    });

    describe('Bus api', () => {
      let createEventSpy;
      const sandbox = sinon.sandbox.create();

      before((done) => {
        // Wait for 500ms in order to wait for createEvent calls from previous tests to complete
        testUtil.wait(done);
      });

      beforeEach(() => {
        createEventSpy = sandbox.spy(busApi, 'createEvent');
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should send correct BUS API messages when phase added', (done) => {
        request(server)
        .post(`/v5/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.callCount.should.be.eql(2);

              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_CREATED, sinon.match({
                resource: RESOURCES.PHASE,
                name: body.name,
                status: body.status,
                budget: body.budget,
                progress: body.progress,
                projectId,
              })).should.be.true;

              // Check Notification Service events
              createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_UPDATED, sinon.match({
                projectId,
                projectName,
                projectUrl: `https://local.topcoder-dev.com/projects/${projectId}`,
                userId: 40051332,
                initiatorUserId: 40051332,
              })).should.be.true;

              done();
            });
          }
        });
      });
    });

    describe('RabbitMQ Message topic', () => {
      let createMessageSpy;
      let publishSpy;
      let sandbox;

      // Wait for 500ms in order to wait for createEvent calls from previous tests to complete
      before(async () => new Promise(resolve => setTimeout(() => resolve(), 500)));

      beforeEach(async () => {
        sandbox = sinon.sandbox.create();
        server.services.pubsub = new RabbitMQService(server.logger);

        // initialize RabbitMQ
        server.services.pubsub.init(
          config.get('rabbitmqURL'),
          config.get('pubsubExchangeName'),
          config.get('pubsubQueueName'),
        );

        // add project to ES index
        await server.services.es.index({
          index: ES_PROJECT_INDEX,
          type: ES_PROJECT_TYPE,
          id: projectId,
          body: {
            doc: project,
          },
        });

        return new Promise(resolve => setTimeout(() => {
          publishSpy = sandbox.spy(server.services.pubsub, 'publish');
          createMessageSpy = sandbox.spy(messageService, 'createTopic');
          resolve();
        }, 500));
      });

      afterEach(() => {
        sandbox.restore();
      });

      after(() => {
        mockRabbitMQ(server);
      });

      it('should send message topic when phase added', (done) => {
        const mockHttpClient = _.merge(testUtil.mockHttpClient, {
          post: () => Promise.resolve({
            status: 200,
            data: {},
          }),
        });
        sandbox.stub(messageService, 'getClient', () => mockHttpClient);
        request(server)
            .post(`/v5/projects/${projectId}/phases/`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.copilot}`,
            })
            .send(body)
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err) => {
              if (err) {
                done(err);
              } else {
                testUtil.wait(() => {
                  publishSpy.calledOnce.should.be.true;
                  publishSpy.calledWith('project.phase.added').should.be.true;
                  createMessageSpy.calledOnce.should.be.true;
                  createMessageSpy.calledWith(sinon.match({ reference: 'project',
                    referenceId: '1',
                    tag: 'phase#1',
                    title: 'test project phase',
                  })).should.be.true;
                  done();
                });
              }
            });
      });
    });
  });
});
