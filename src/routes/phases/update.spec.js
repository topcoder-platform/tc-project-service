/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import sinon from 'sinon';
import chai from 'chai';
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
  BUS_API_EVENT,
} from '../../constants';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

const should = chai.should();

const body = {
  name: 'test project phase',
  description: 'test project phase description',
  requirements: 'test project phase requirements',
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

const updateBody = {
  name: 'test project phase xxx',
  description: 'test project phase description xxx',
  requirements: 'test project phase requirements xxx',
  status: 'inactive',
  startDate: '2018-05-11T00:00:00Z',
  endDate: '2018-05-12T12:00:00Z',
  budget: 123456.789,
  progress: 9.8765432,
  details: {
    message: 'This is another json',
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
  let phaseId;
  let phaseId2;
  let phaseId3;
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
  const topic = {
    id: 1,
    title: 'test project phase',
    posts:
    [{ id: 1,
      type: 'post',
      body: 'body',
    }],
  };
  beforeEach((done) => {
    // mocks
    testUtil.clearDb()
      .then(() => {
        models.Project.create(project).then((p) => {
          projectId = p.id;
          projectName = p.name;
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
          }]).then(() => {
            _.assign(body, { projectId });
            const phases = [
              body,
              _.assign({ order: 1 }, body),
              _.assign({}, body, { status: 'draft' }),
            ];
            models.ProjectPhase.bulkCreate(phases, { returning: true })
              .then((createdPhases) => {
                phaseId = createdPhases[0].id;
                phaseId2 = createdPhases[1].id;
                phaseId3 = createdPhases[2].id;

                done();
              });
          });
        });
      });
  });

  afterEach((done) => {
    testUtil.clearDb(done);
  });

  describe('PATCH /projects/{projectId}/phases/{phaseId}', () => {
    it('should return 403 if user does not have permissions (non team member)', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 403 if user does not have permissions (customer)', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 404 when no project with specific projectId', (done) => {
      request(server)
        .patch(`/v4/projects/999/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no phase with specific phaseId', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/999`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 422 when parameters are invalid', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({
          param: {
            progress: -15,
          },
        })
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 400 when startDate > endDate', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({
          param: {
            endDate: '2018-05-13T00:00:00Z',
          },
        })
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return updated phase when user have permission and parameters are valid', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            validatePhase(resJson, updateBody);
            done();
          }
        });
    });

    it('should return updated phase when parameters are valid (0 for non -ve numbers)', (done) => {
      const bodyWithZeros = _.cloneDeep(updateBody);
      bodyWithZeros.duration = 0;
      bodyWithZeros.spentBudget = 0.0;
      bodyWithZeros.budget = 0.0;
      bodyWithZeros.progress = 0.0;
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: bodyWithZeros })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            validatePhase(resJson, bodyWithZeros);
            done();
          }
        });
    });

    it('should return updated phase if the order is specified', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: _.assign({ order: 1 }, updateBody) })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            validatePhase(resJson, updateBody);
            resJson.order.should.be.eql(1);

            // Check the order of the other phase
            models.ProjectPhase.findOne({ where: { id: phaseId2 } })
              .then((phase2) => {
                phase2.order.should.be.eql(2);
                done();
              });
          }
        });
    });

    it('should return 200 if requested by admin', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ param: _.assign({ order: 1 }, updateBody) })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(done);
    });

    it('should return 200 if requested by manager which is a member', (done) => {
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
          .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.manager}`,
          })
          .send({ param: _.assign({ order: 1 }, updateBody) })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(done);
      });
    });

    it('should return 403 if requested by manager which is not a member', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({ param: _.assign({ order: 1 }, updateBody) })
        .expect('Content-Type', /json/)
        .expect(403)
        .end(done);
    });

    it('should return 403 if requested by non-member copilot', (done) => {
      models.ProjectMember.destroy({
        where: { userId: testUtil.userIds.copilot, projectId },
      }).then(() => {
        request(server)
          .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({ param: _.assign({ order: 1 }, updateBody) })
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

      it('should NOT send message BUS_API_EVENT.PROJECT_PLAN_UPDATED when spentBudget updated', (done) => {
        request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            spentBudget: 123,
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.calledOnce.should.be.true;

              createEventSpy.firstCall.calledWith(BUS_API_EVENT.PROJECT_PHASE_UPDATE_PAYMENT);
              done();
            });
          }
        });
      });

      it('should NOT send message BUS_API_EVENT.PROJECT_PLAN_UPDATED when progress updated', (done) => {
        request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            progress: 50,
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.callCount.should.be.eql(2);
              createEventSpy.firstCall.calledWith(BUS_API_EVENT.PROJECT_PHASE_UPDATE_PROGRESS);
              createEventSpy.secondCall.calledWith(BUS_API_EVENT.PROJECT_PROGRESS_MODIFIED);
              done();
            });
          }
        });
      });

      it('should NOT send message BUS_API_EVENT.PROJECT_PLAN_UPDATED when details updated', (done) => {
        request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            details: {
              text: 'something',
            },
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.calledOnce.should.be.true;
              createEventSpy.firstCall.calledWith(BUS_API_EVENT.PROJECT_PHASE_UPDATE_SCOPE);
              done();
            });
          }
        });
      });

      it('should NOT send message BUS_API_EVENT.PROJECT_PLAN_UPDATED when status updated (completed)', (done) => {
        request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            status: 'completed',
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.calledOnce.should.be.true;
              createEventSpy.firstCall.calledWith(BUS_API_EVENT.PROJECT_PHASE_TRANSITION_COMPLETED);
              done();
            });
          }
        });
      });

      it('should NOT send message BUS_API_EVENT.PROJECT_PLAN_UPDATED when status updated (active)', (done) => {
        request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId3}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            status: 'active',
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.calledOnce.should.be.true;
              createEventSpy.firstCall.calledWith(BUS_API_EVENT.PROJECT_PHASE_TRANSITION_ACTIVE);
              done();
            });
          }
        });
      });

      it('should NOT send message BUS_API_EVENT.PROJECT_PLAN_UPDATED when budget updated', (done) => {
        request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            budget: 123,
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.notCalled.should.be.true;
              done();
            });
          }
        });
      });

      it('should send message BUS_API_EVENT.PROJECT_PLAN_UPDATED when startDate updated', (done) => {
        request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            startDate: 123,
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.calledOnce.should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PLAN_UPDATED, sinon.match({
                projectId,
                projectName,
                projectUrl: `https://local.topcoder-dev.com/projects/${projectId}`,
                // originalPhase: sinon.match(originalPhase),
                // updatedPhase: sinon.match(updatedPhase),
                userId: 40051332,
                initiatorUserId: 40051332,
              })).should.be.true;
              done();
            });
          }
        });
      });

      it('should send message BUS_API_EVENT.PROJECT_PLAN_UPDATED when duration updated', (done) => {
        request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            duration: 100,
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.calledOnce.should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PLAN_UPDATED, sinon.match({
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

      it('should not send message BUS_API_EVENT.PROJECT_PLAN_UPDATED when order updated', (done) => {
        request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            order: 100,
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.notCalled.should.be.true;
              done();
            });
          }
        });
      });

      it('should not send message BUS_API_EVENT.PROJECT_PLAN_UPDATED when endDate updated', (done) => {
        request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            endDate: new Date(),
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.notCalled.should.be.true;
              done();
            });
          }
        });
      });
    });

    describe('RabbitMQ Message topic', () => {
      let updateMessageSpy;
      let publishSpy;
      let sandbox;

      before(async (done) => {
        // Wait for 500ms in order to wait for createEvent calls from previous tests to complete
        testUtil.wait(done);
      });

      beforeEach(async (done) => {
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
            doc: _.assign(project, { phases: [_.assign(body, { id: phaseId, projectId })] }),
          },
        });

        testUtil.wait(() => {
          publishSpy = sandbox.spy(server.services.pubsub, 'publish');
          updateMessageSpy = sandbox.spy(messageService, 'updateTopic');
          sandbox.stub(messageService, 'getTopicByTag', () => Promise.resolve(topic));
          done();
        });
      });

      afterEach(() => {
        sandbox.restore();
      });

      after(() => {
        mockRabbitMQ(server);
      });

      it('should send message topic when phase Updated', (done) => {
        const mockHttpClient = _.merge(testUtil.mockHttpClient, {
          post: () => Promise.resolve({
            status: 200,
            data: {
              id: 'requesterId',
              version: 'v3',
              result: {
                success: true,
                status: 200,
                content: {},
              },
            },
          }),
        });
        sandbox.stub(messageService, 'getClient', () => mockHttpClient);
        request(server)
            .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send({ param: _.assign(updateBody, { budget: 123 }) })
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err) => {
              if (err) {
                done(err);
              } else {
                testUtil.wait(() => {
                  publishSpy.calledOnce.should.be.true;
                  publishSpy.calledWith('project.phase.updated').should.be.true;
                  updateMessageSpy.calledOnce.should.be.true;
                  updateMessageSpy.calledWith(topic.id, sinon.match({
                    title: updateBody.name,
                    postId: topic.posts[0].id,
                    content: topic.posts[0].body })).should.be.true;
                  done();
                });
              }
            });
      });
    });
  });
});
