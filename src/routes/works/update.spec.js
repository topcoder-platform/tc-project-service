/* eslint-disable no-unused-expressions */
/**
 * Tests for update.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';
import sinon from 'sinon';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import { BUS_API_EVENT, RESOURCES, CONNECT_NOTIFICATION_EVENT } from '../../constants';

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
  resJson.status.should.be.eql(expectedPhase.status);
  resJson.budget.should.be.eql(expectedPhase.budget);
  resJson.progress.should.be.eql(expectedPhase.progress);
  resJson.details.should.be.eql(expectedPhase.details);
};

describe('UPDATE work', () => {
  let projectId;
  let projectName;
  let workStreamId;
  let workId;
  let workId2;
  let workId3;

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
            models.WorkManagementPermission.create({
              policy: 'work.edit',
              permission: {
                allowRule: {
                  projectRoles: ['customer', 'copilot'],
                  topcoderRoles: ['Connect Manager', 'Connect Admin', 'administrator'],
                },
                denyRule: { projectRoles: ['copilot'] },
              },
              projectTemplateId: template.id,
              details: {},
              createdBy: 1,
              updatedBy: 1,
              lastActivityAt: 1,
              lastActivityUserId: '1',
            })
              .then(() => {
                // Create projects
                models.Project.create(_.assign(project, { templateId: template.id }))
                  .then((_project) => {
                    projectId = _project.id;
                    projectName = _project.name;
                    models.WorkStream.create({
                      name: 'Work Stream',
                      type: 'generic',
                      status: 'active',
                      projectId,
                      createdBy: 1,
                      updatedBy: 1,
                    }).then((entity) => {
                      workStreamId = entity.id;
                      _.assign(body, { projectId });
                      const createPhases = [
                        body,
                        _.assign({ order: 1 }, body),
                        _.assign({}, body, { status: 'draft' }),
                      ];
                      models.ProjectPhase.bulkCreate(createPhases, { returning: true }).then((phases) => {
                        workId = phases[0].id;
                        workId2 = phases[1].id;
                        workId3 = phases[2].id;
                        models.PhaseWorkStream.bulkCreate([{
                          phaseId: phases[0].id,
                          workStreamId,
                        }, {
                          phaseId: phases[1].id,
                          workStreamId,
                        }, {
                          phaseId: phases[2].id,
                          workStreamId,
                        }]).then(() => {
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
                          }]).then(() => done());
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

  describe('PATCH /projects/{projectId}/workstreams/{workStreamId}/works/{workId}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
        .send(updateBody)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(updateBody)
        .expect(403, done);
    });

    it('should return 404 when no work stream with specific workStreamId', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/999/works/${workId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(updateBody)
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no work with specific workId', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/999`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(updateBody)
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 400 when parameters are invalid', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          progress: -15,
        })
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 when startDate > endDate', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          endDate: '2018-05-13T00:00:00Z',
        })
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(updateBody)
        .expect(200, done);
    });

    it('should return updated phase when user have permission and parameters are valid', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(updateBody)
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
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
        .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(bodyWithZeros)
        .expect('Content-Type', /json/)
        .expect(200)
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

    it('should return updated phase if the order is specified', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(_.assign({ order: 1 }, updateBody))
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            validatePhase(resJson, updateBody);
            resJson.order.should.be.eql(1);

            // Check the order of the other phase
            models.ProjectPhase.findOne({ where: { id: workId2 } })
              .then((work2) => {
                work2.order.should.be.eql(2);
                done();
              });
          }
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

      it('should send correct BUS API messages when spentBudget updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            spentBudget: 123,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(2);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_UPDATED, sinon.match({
                  resource: RESOURCES.PHASE,
                  id: workId,
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_WORK_UPDATE_PAYMENT).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when progress updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            progress: 50,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(3);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_UPDATED, sinon.match({
                  resource: RESOURCES.PHASE,
                  id: workId,
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_WORK_UPDATE_PROGRESS).should.be.true;
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_PROGRESS_MODIFIED).should.be.true;
                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when details updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            details: {
              text: 'something',
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

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_UPDATED, sinon.match({
                  resource: RESOURCES.PHASE,
                  id: workId,
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_WORK_UPDATE_SCOPE).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when status updated (completed)', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            status: 'completed',
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(2);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_UPDATED, sinon.match({
                  resource: RESOURCES.PHASE,
                  id: workId,
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_WORK_TRANSITION_COMPLETED).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when status updated (active)', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId3}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            status: 'active',
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(2);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_UPDATED, sinon.match({
                  resource: RESOURCES.PHASE,
                  id: workId3,
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_WORK_TRANSITION_ACTIVE).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when budget updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            budget: 123,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(1);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_UPDATED, sinon.match({
                  resource: RESOURCES.PHASE,
                  id: workId,
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when startDate updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            startDate: 123,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(2);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_UPDATED, sinon.match({
                  resource: RESOURCES.PHASE,
                  id: workId,
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_UPDATED, sinon.match({
                  projectId,
                  projectName,
                  projectUrl: `https://local.topcoder-dev.com/projects/${projectId}`,
                  userId: 40051333,
                  initiatorUserId: 40051333,
                })).should.be.true;

                done();
              });
            }
          });
      });


      it('should send correct BUS API messages when duration updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            duration: 100,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(2);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_UPDATED, sinon.match({
                  duration: 100,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_UPDATED, sinon.match({
                  projectId,
                  projectName,
                  projectUrl: `https://local.topcoder-dev.com/projects/${projectId}`,
                  userId: 40051333,
                  initiatorUserId: 40051333,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when order updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            order: 100,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(1);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_UPDATED, sinon.match({
                  resource: RESOURCES.PHASE,
                  id: workId,
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                // NOTE: no other event should be called, as this phase doesn't move any other phases

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when endDate updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/workstreams/${workStreamId}/works/${workId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            endDate: new Date(),
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(1);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_UPDATED, sinon.match({
                  resource: RESOURCES.PHASE,
                  id: workId,
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                done();
              });
            }
          });
      });
    });
  });
});
