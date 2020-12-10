/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import sinon from 'sinon';
import chai from 'chai';
import request from 'supertest';
import server from '../../app';
import models from '../../models';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import { RESOURCES, BUS_API_EVENT } from '../../constants';

const should = chai.should();

const body = {
  name: 'test phase product',
  type: 'product1',
  estimatedPrice: 20.0,
  actualPrice: 1.23456,
  details: {
    message: 'This can be any json',
  },
};

describe('Phase Products', () => {
  let projectId;
  let phaseId;
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
              done();
            });
          });
        });
      });
  });

  afterEach((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects/{projectId}/phases/{phaseId}/products', () => {
    it('should return 403 if user does not have permissions (non team member)', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 403 if user does not have permissions (customer)', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/products`)
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
        .post(`/v5/projects/${projectId}/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(reqBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 when type not provided', (done) => {
      const reqBody = _.cloneDeep(body);
      delete reqBody.type;
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(reqBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 when estimatedPrice is negative', (done) => {
      const reqBody = _.cloneDeep(body);
      reqBody.estimatedPrice = -20;
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(reqBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 when actualPrice is negative', (done) => {
      const reqBody = _.cloneDeep(body);
      reqBody.actualPrice = -20;
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(reqBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 404 when project is not found', (done) => {
      request(server)
        .post(`/v5/projects/99999/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when project phase is not found', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/99999/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 201 if payload is valid', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/products`)
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

    it('should return 201 if requested by admin', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
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
          .post(`/v5/projects/${projectId}/phases/${phaseId}/products`)
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
        .post(`/v5/projects/${projectId}/phases/${phaseId}/products`)
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
          .post(`/v5/projects/${projectId}/phases/${phaseId}/products`)
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

      it('should send correct BUS API messages when product phase created', (done) => {
        request(server)
          .post(`/v5/projects/${projectId}/phases/${phaseId}/products`)
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
                createEventSpy.callCount.should.be.eql(1);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_PHASE_CREATED, sinon.match({
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
