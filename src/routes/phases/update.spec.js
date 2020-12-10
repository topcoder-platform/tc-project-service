/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import sinon from 'sinon';
import chai from 'chai';
import request from 'supertest';
import server from '../../app';
import models from '../../models';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import {
  BUS_API_EVENT,
  RESOURCES,
  CONNECT_NOTIFICATION_EVENT,
} from '../../constants';

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
        .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send(updateBody)
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 403 if user does not have permissions (customer)', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(updateBody)
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 404 when no project with specific projectId', (done) => {
      request(server)
        .patch(`/v5/projects/999/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(updateBody)
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no phase with specific phaseId', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/phases/999`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(updateBody)
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 400 when parameters are invalid', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({
          progress: -15,
        })
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 when startDate > endDate', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({
          endDate: '2018-05-13T00:00:00Z',
        })
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return updated phase when user have permission and parameters are valid', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
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
        .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
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

    it('should return 200 if requested by admin', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(_.assign({ order: 1 }, updateBody))
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
          .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.manager}`,
          })
          .send(_.assign({ order: 1 }, updateBody))
          .expect('Content-Type', /json/)
          .expect(200)
          .end(done);
      });
    });

    it('should return 403 if requested by manager which is not a member', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(_.assign({ order: 1 }, updateBody))
        .expect('Content-Type', /json/)
        .expect(403)
        .end(done);
    });

    it('should return 403 if requested by non-member copilot', (done) => {
      models.ProjectMember.destroy({
        where: { userId: testUtil.userIds.copilot, projectId },
      }).then(() => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send(_.assign({ order: 1 }, updateBody))
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

      it('should send correct BUS API messages when spentBudget updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
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
                  id: phaseId,
                  updatedBy: testUtil.userIds.copilot,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_PHASE_UPDATE_PAYMENT).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when progress updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
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
                  id: phaseId,
                  updatedBy: testUtil.userIds.copilot,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_PHASE_UPDATE_PROGRESS).should.be.true;
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_PROGRESS_MODIFIED).should.be.true;
                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when details updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
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
                  id: phaseId,
                  updatedBy: testUtil.userIds.copilot,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_PHASE_UPDATE_SCOPE).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when status updated (completed)', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
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
                  id: phaseId,
                  updatedBy: testUtil.userIds.copilot,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_PHASE_TRANSITION_COMPLETED).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when status updated (active)', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId3}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
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
                  id: phaseId3,
                  updatedBy: testUtil.userIds.copilot,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_PHASE_TRANSITION_ACTIVE).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when budget updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
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
                  id: phaseId,
                  updatedBy: testUtil.userIds.copilot,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when startDate updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
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
                  id: phaseId,
                  updatedBy: testUtil.userIds.copilot,
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


      it('should send correct BUS API messages when duration updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
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
                  userId: 40051332,
                  initiatorUserId: 40051332,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when order updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
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
                  id: phaseId,
                  updatedBy: testUtil.userIds.copilot,
                })).should.be.true;

                // NOTE: no other event should be called, as this phase doesn't move any other phases

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when endDate updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
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
                  id: phaseId,
                  updatedBy: testUtil.userIds.copilot,
                })).should.be.true;

                done();
              });
            }
          });
      });
    });
  });
});
