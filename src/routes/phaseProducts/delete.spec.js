/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import sinon from 'sinon';
import request from 'supertest';
import chai from 'chai';
import server from '../../app';
import models from '../../models';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import { BUS_API_EVENT, RESOURCES } from '../../constants';

const should = chai.should(); // eslint-disable-line no-unused-vars

const expectAfterDelete = (projectId, phaseId, id, err, next) => {
  if (err) throw err;
  setTimeout(() =>
    models.PhaseProduct.findOne({
      where: {
        id,
        projectId,
        phaseId,
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

  afterEach((done) => {
    testUtil.clearDb(done);
  });

  describe('DELETE /projects/{id}/phases/{phaseId}/products/{productId}', () => {
    it('should return 403 when user have no permission (non team member)', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 403 when user have no permission (customer)', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 404 when no project with specific projectId', (done) => {
      request(server)
        .delete(`/v5/projects/999/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no phase with specific phaseId', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/phases/99999/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no product with specific productId', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/phases/${phaseId}/products/99999`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 204 when user have project permission', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(projectId, phaseId, productId, err, done));
    });

    it('should return 204 if requested by admin', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
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
          .delete(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.manager}`,
          })
          .expect(204)
          .end(done);
      });
    });

    it('should return 403 if requested by manager which is not a member', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
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
          .delete(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
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

      it('should send correct BUS API messages when product phase removed', (done) => {
        request(server)
          .delete(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .expect(204)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(1);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_DELETED, sinon.match({
                  resource: RESOURCES.PHASE_PRODUCT,
                })).should.be.true;

                done();
              });
            }
          });
      });
    });
  });
});
