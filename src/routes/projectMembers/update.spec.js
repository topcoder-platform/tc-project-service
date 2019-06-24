/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';
import sinon from 'sinon';
import models from '../../models';
import server from '../../app';
import util from '../../util';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import { BUS_API_EVENT, RESOURCES } from '../../constants';

const should = chai.should();

describe('Project members update', () => {
  let project1;
  let member1;
  let member2;
  let member3;
  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => {
        models.Project.create({
          type: 'generic',
          directProjectId: 1,
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
          project1 = p;
          // create members
          models.ProjectMember.create({
            userId: 40051334,
            projectId: project1.id,
            role: 'manager',
            isPrimary: false,
            createdBy: 1,
            updatedBy: 1,
            createdAt: '2016-06-30 00:33:07+00',
            updatedAt: '2016-06-30 00:33:07+00',
          }).then((pm) => {
            member1 = pm.get({
              plain: true,
            });
            models.ProjectMember.create({
              userId: 40051332,
              projectId: project1.id,
              role: 'copilot',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1,
              createdAt: '2016-06-30 00:33:07+00',
              updatedAt: '2016-06-30 00:33:07+00',
            }).then((pm2) => {
              member2 = pm2.get({
                plain: true,
              });
              models.ProjectMember.create({
                userId: 40051330,
                projectId: project1.id,
                role: 'copilot',
                isPrimary: false,
                createdBy: 1,
                updatedBy: 1,
                createdAt: '2016-06-30 00:33:07+00',
                updatedAt: '2016-06-30 00:33:07+00',
              }).then((pm3) => {
                member3 = pm3.get({
                  plain: true,
                });
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

  describe('PUT /projects/{id}/members/{id}', () => {
    const body = {
      role: 'manager',
      isPrimary: false,
    };

    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should return 403 if user does not have permissions', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}/members/${member2.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 400 if no role', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}/members/${member2.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({})
        .expect(400, done);
    });

    it('should return 400 if role is invalid', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}/members/${member2.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send({
          role: 'wrong',
        })
        .expect(400, done);
    });

    it('should return 400 if isPrimary is invalid', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}/members/${member2.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send({
          isPrimary: 'wrong',
        })
        .expect(400, done);
    });

    it('should return 404 if not exist id', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}/members/999999`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(404)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            res.body.message.should.equal('project member not found for project id' +
              ` ${project1.id} and member id 999999`);
            done();
          }
        });
    });

    it('should return 200 if valid user and data(no isPrimary and no updates)', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: [{ roleName: 'administrator' }],
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .patch(`/v5/projects/${project1.id}/members/${member2.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.role.should.equal('customer');
            resJson.isPrimary.should.be.true;
            resJson.updatedBy.should.equal(40051332);
            server.services.pubsub.publish.calledWith('project.member.updated').should.be.true;
            done();
          }
        });
    });

    it('should return 200 if valid user(not copilot any more) for project without direct project id', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: [{ roleName: 'administrator' }],
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      models.Project.update({
        directProjectId: null,
      }, {
        where: {
          id: project1.id,
        },
      })
        .then(() => {
          request(server)
            .patch(`/v5/projects/${project1.id}/members/${member2.id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.copilot}`,
            })
            .send(body)
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
              if (err) {
                done(err);
              } else {
                const resJson = res.body;
                should.exist(resJson);
                resJson.role.should.equal(body.role);
                resJson.isPrimary.should.be.false;
                resJson.updatedBy.should.equal(40051332);
                server.services.pubsub.publish.calledWith('project.member.updated').should.be.true;
                done();
              }
            });
        });
    });

    it('should return 200 if valid user(not copilot any more) and data', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        delete: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: true,
            },
          },
        }),
      });
      const deleteSpy = sinon.spy(mockHttpClient, 'delete');
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .patch(`/v5/projects/${project1.id}/members/${member2.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.role.should.equal(body.role);
            resJson.isPrimary.should.be.false;
            resJson.updatedBy.should.equal(40051332);
            deleteSpy.should.have.been.calledOnce;
            server.services.pubsub.publish.calledWith('project.member.updated').should.be.true;
            done();
          }
        });
    });

    it.skip('should return 500 if error to remove copilot from direct project', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        delete: () => Promise.reject(new Error('error message')),
      });
      const deleteSpy = sinon.spy(mockHttpClient, 'delete');
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .patch(`/v5/projects/${project1.id}/members/${member2.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(500)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const result = res.body.result;
            result.success.should.be.false;
            result.status.should.equal(500);
            result.content.message.should.equal('error message');
            deleteSpy.should.have.been.calledOnce;
            done();
          }
        });
    });

    it('should return 200 if valid user(become manager) and data', (done) => {
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
      const postSpy = sinon.spy(mockHttpClient, 'post');
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .patch(`/v5/projects/${project1.id}/members/${member3.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          role: 'manager',
          isPrimary: false,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.role.should.equal('manager');
            resJson.isPrimary.should.be.false;
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051334);
            postSpy.should.have.been.calledOnce;
            done();
          }
        });
    });

    it('should return 200 if valid user(become manager) and data (without directProjectId)', (done) => {
      models.Project.update({
        directProjectId: null,
      }, {
        where: {
          id: project1.id,
        },
      })
        .then(() => {
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
          const postSpy = sinon.spy(mockHttpClient, 'post');
          sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
          request(server)
            .patch(`/v5/projects/${project1.id}/members/${member3.id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.manager}`,
            })
            .send({
              role: 'manager',
              isPrimary: false,
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
              if (err) {
                done(err);
              } else {
                const resJson = res.body;
                should.exist(resJson);
                resJson.role.should.equal('manager');
                resJson.isPrimary.should.be.false;
                resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
                resJson.updatedBy.should.equal(40051334);
                postSpy.should.not.have.been.calledOnce;
                done();
              }
            });
        });
    });

    it('should return 200 if valid user(become copilot) and data', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                copilotProjectId: 2,
              },
            },
          },
        }),
      });
      const postSpy = sinon.spy(mockHttpClient, 'post');
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .patch(`/v5/projects/${project1.id}/members/${member1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          role: 'copilot',
          isPrimary: true,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.role.should.equal('copilot');
            resJson.isPrimary.should.be.true;
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051332);
            postSpy.should.have.been.calledOnce;
            done();
          }
        });
    });

    describe('Bus api', () => {
      let createEventSpy;

      before((done) => {
        // Wait for 500ms in order to wait for createEvent calls from previous tests to complete
        testUtil.wait(done);
      });

      beforeEach(() => {
        createEventSpy = sandbox.spy(busApi, 'createEvent');
      });

      it('sends single BUS_API_EVENT.PROJECT_MEMBER_UPDATED message when user role updated', (done) => {
        const mockHttpClient = _.merge(testUtil.mockHttpClient, {
          get: () => Promise.resolve({
            status: 200,
            data: {
              id: 'requesterId',
              version: 'v3',
              result: {
                success: true,
                status: 200,
                content: [{ roleName: 'administrator' }],
              },
            },
          }),
        });
        sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
        request(server)
        .patch(`/v5/projects/${project1.id}/members/${member2.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          role: 'customer',
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.calledOnce.should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_UPDATED).should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_UPDATED,
                sinon.match({ resource: RESOURCES.PROJECT_MEMBER })).should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_UPDATED,
                sinon.match({ id: member2.id })).should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_UPDATED,
                sinon.match({ role: 'customer' })).should.be.true;
              createEventSpy.calledWith(BUS_API_EVENT.PROJECT_MEMBER_UPDATED,
                  sinon.match({ userId: 40051332 })).should.be.true;
              done();
            });
          }
        });
      });
    });
  });
});
