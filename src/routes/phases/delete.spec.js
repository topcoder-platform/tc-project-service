/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import request from 'supertest';
import sinon from 'sinon';
import chai from 'chai';
import config from 'config';
import server from '../../app';
import models from '../../models';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import messageService from '../../services/messageService';
import RabbitMQService from '../../services/rabbitmq';
import mockRabbitMQ from '../../tests/mockRabbitMQ';
import {
  BUS_API_EVENT,
  RESOURCES,
  CONNECT_NOTIFICATION_EVENT,
} from '../../constants';

const should = chai.should(); // eslint-disable-line no-unused-vars

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

const expectAfterDelete = (projectId, id, err, next) => {
  if (err) throw err;
  setTimeout(() =>
  models.ProjectPhase.findOne({
    where: {
      id,
      projectId,
    },
    paranoid: false,
  })
    .then((res) => {
      if (!res) {
        throw new Error('Should found the entity');
      } else {
        chai.assert.isNotNull(res.deletedAt);
        chai.assert.isNotNull(res.deletedBy);
      }
      next();
    }), 500);
};
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

describe('Project Phases', () => {
  let projectId;
  let phaseId;
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
              models.ProjectPhase.create(body).then((phase) => {
                phaseId = phase.id;
                done();
              });
            });
          });
        });
  });

  afterEach((done) => {
    testUtil.clearDb(done);
  });

  describe('DELETE /projects/{projectId}/phases/{phaseId}', () => {
    it('should return 403 if user does not have permissions (non team member)', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 403 if user does not have permissions (customer)', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 404 when no project with specific projectId', (done) => {
      request(server)
        .delete(`/v5/projects/999/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no phase with specific phaseId', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/phases/999`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 204 when user have project permission', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(projectId, phaseId, err, done));
    });

    it('should return 204 if requested by admin', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end(done);
    });

    it('should return 204 if requested by manager which is a member', (done) => {
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
          .delete(`/v5/projects/${projectId}/phases/${phaseId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.manager}`,
          })
          .expect(204)
          .end(done);
      });
    });

    it('should return 403 if requested by manager which is not a member', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403)
        .end(done);
    });

    it('should return 403 if requested by non-member copilot', (done) => {
      models.ProjectMember.destroy({
        where: { userId: testUtil.userIds.copilot, projectId },
      }).then(() => {
        request(server)
          .delete(`/v5/projects/${projectId}/phases/${phaseId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
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

      it('should send correct BUS API messages when phase removed', (done) => {
        request(server)
        .delete(`/v5/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(204)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.callCount.should.be.eql(2);

              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_DELETED, sinon.match({
                resource: RESOURCES.PHASE,
                id: phaseId,
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
      let deleteTopicSpy;
      let deletePostsSpy;
      let publishSpy;
      let sandbox;

      before((done) => {
        // Wait for 500ms in order to wait for createEvent calls from previous tests to complete
        testUtil.wait(done);
      });

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
            doc: _.assign(project, { phases: [_.assign(body, { id: phaseId, projectId })] }),
          },
        });

        return new Promise(resolve => setTimeout(() => {
          publishSpy = sandbox.spy(server.services.pubsub, 'publish');
          deleteTopicSpy = sandbox.spy(messageService, 'deleteTopic');
          deletePostsSpy = sandbox.spy(messageService, 'deletePosts');
          sandbox.stub(messageService, 'getTopicByTag', () => Promise.resolve(topic));
          resolve();
        }, 500));
      });

      afterEach(() => {
        sandbox.restore();
      });

      after(() => {
        mockRabbitMQ(server);
      });

      it('should send message topic when phase deleted', (done) => {
        const mockHttpClient = _.merge(testUtil.mockHttpClient, {
          delete: () => Promise.resolve(true),
        });
        sandbox.stub(messageService, 'getClient', () => mockHttpClient);
        request(server)
            .delete(`/v5/projects/${projectId}/phases/${phaseId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(204)
            .end((err) => {
              if (err) {
                done(err);
              } else {
                testUtil.wait(() => {
                  publishSpy.calledOnce.should.be.true;
                  publishSpy.firstCall.calledWith('project.phase.removed').should.be.true;
                  deleteTopicSpy.calledOnce.should.be.true;
                  deleteTopicSpy.calledWith(topic.id).should.be.true;
                  deletePostsSpy.calledWith(topic.id).should.be.true;
                  done();
                });
              }
            });
      });
    });
  });
});
