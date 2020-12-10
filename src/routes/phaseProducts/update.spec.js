/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import server from '../../app';
import models from '../../models';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import { BUS_API_EVENT, RESOURCES, CONNECT_NOTIFICATION_EVENT } from '../../constants';

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

const updateBody = {
  name: 'test phase product xxx',
  type: 'product2',
  estimatedPrice: 123456.789,
  actualPrice: 9.8765432,
  details: {
    message: 'This is another json',
  },
};

describe('Phase Products', () => {
  let projectId;
  let phaseId;
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
    // mocks
    testUtil.clearDb()
      .then(() => {
        models.Project.create({
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
        }).then((p) => {
          projectId = p.id;
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
              phaseId = phase.id;
              _.assign(body, { phaseId, projectId });

              models.PhaseProduct.create(body).then((product) => {
                productId = product.id;
                done();
              });
            });
          });
        });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('PATCH /projects/{id}/phases/{phaseId}/products/{productId}', () => {
    it('should return 403 when user have no permission (non team member)', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send(updateBody)
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 403 when user have no permission (customer)', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(updateBody)
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 404 when no project with specific projectId', (done) => {
      request(server)
        .patch(`/v5/projects/999/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(updateBody)
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no phase with specific phaseId', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/phases/99999/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(updateBody)
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no product with specific productId', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/phases/${phaseId}/products/99999`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(updateBody)
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 400 when parameters are invalid', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/phases/${phaseId}/products/99999`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          estimatedPrice: -15,
        })
        .expect('Content-Type', /json/)
        .expect(400, done);
    });


    it('should return updated product when user have permission and parameters are valid', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
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
            should.exist(resJson);
            resJson.name.should.be.eql(updateBody.name);
            resJson.type.should.be.eql(updateBody.type);
            resJson.estimatedPrice.should.be.eql(updateBody.estimatedPrice);
            resJson.actualPrice.should.be.eql(updateBody.actualPrice);
            resJson.details.should.be.eql(updateBody.details);
            done();
          }
        });
    });

    it('should return 200 if requested by admin', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(updateBody)
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
          .patch(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.manager}`,
          })
          .send(updateBody)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(done);
      });
    });

    it('should return 403 if requested by manager which is not a member', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(updateBody)
        .expect('Content-Type', /json/)
        .expect(403)
        .end(done);
    });

    it('should return 403 if requested by non-member copilot', (done) => {
      models.ProjectMember.destroy({
        where: { userId: testUtil.userIds.copilot, projectId },
      }).then(() => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send(updateBody)
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

      it('should send correct BUS API messages when name updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({
            name: 'new name',
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(2);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_PRODUCT_UPDATED, sinon.match({
                  resource: RESOURCES.PHASE_PRODUCT,
                  name: 'new name',
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_UPDATED, sinon.match({
                  projectId: 1,
                  projectName: 'test1',
                  projectUrl: 'https://local.topcoder-dev.com/projects/1',
                  userId: 40051332,
                  initiatorUserId: 40051332,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when estimatedPrice updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({
            estimatedPrice: 123,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(2);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_PRODUCT_UPDATED, sinon.match({
                  resource: RESOURCES.PHASE_PRODUCT,
                  estimatedPrice: 123,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_UPDATED, sinon.match({
                  projectId: 1,
                  projectName: 'test1',
                  projectUrl: 'https://local.topcoder-dev.com/projects/1',
                  userId: 40051332,
                  initiatorUserId: 40051332,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when actualPrice updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({
            actualPrice: 123,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(2);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_PRODUCT_UPDATED, sinon.match({
                  resource: RESOURCES.PHASE_PRODUCT,
                  actualPrice: 123,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_UPDATED, sinon.match({
                  projectId: 1,
                  projectName: 'test1',
                  projectUrl: 'https://local.topcoder-dev.com/projects/1',
                  userId: 40051332,
                  initiatorUserId: 40051332,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when details updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({
            details: 'something',
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(3);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_PRODUCT_UPDATED, sinon.match({
                  resource: RESOURCES.PHASE_PRODUCT,
                  details: 'something',
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_PRODUCT_SPECIFICATION_MODIFIED)
                  .should.be.true;
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_PLAN_UPDATED, sinon.match({
                  projectId: 1,
                  projectName: 'test1',
                  projectUrl: 'https://local.topcoder-dev.com/projects/1',
                  userId: 40051332,
                  initiatorUserId: 40051332,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when type updated', (done) => {
        request(server)
          .patch(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({
            type: 'another type',
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(1);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_PRODUCT_UPDATED, sinon.match({
                  resource: RESOURCES.PHASE_PRODUCT,
                  type: 'another type',
                })).should.be.true;

                done();
              });
            }
          });
      });
    });
  });
});
