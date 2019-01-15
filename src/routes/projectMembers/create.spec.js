/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';

import models from '../../models';
import util from '../../util';
import server from '../../app';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import { USER_ROLE, BUS_API_EVENT } from '../../constants';

const should = chai.should();

describe('Project Members create', () => {
  let project1;
  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => {
        models.Project.create({
          type: 'generic',
          directProjectId: 1,
          billingAccountId: 1,
          name: 'test1',
          description: 'test project1',
          status: 'reviewed',
          details: {},
          createdBy: 1,
          updatedBy: 1,
          lastActivityAt: 1,
          lastActivityUserId: '1',
        }).then((p) => {
          project1 = p;
          done();
        });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects/{id}/members/', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should return 403 if user does not have permissions', (done) => {
      request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 201 and then 400 if user is already registered', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: [{
                roleName: USER_ROLE.COPILOT,
              }],
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
      .post(`/v4/projects/${project1.id}/members/`)
      .set({
        Authorization: `Bearer ${testUtil.jwts.copilot}`,
      })
      .expect('Content-Type', /json/)
      .expect(201)
      .end((err, res) => {
        if (err) {
          done(err);
        } else {
          const resJson = res.body.result.content;
          should.exist(resJson);
          resJson.role.should.equal('copilot');
          resJson.projectId.should.equal(project1.id);
          resJson.userId.should.equal(40051332);
          server.services.pubsub.publish.calledWith('project.member.added').should.be.true;

          request(server)
          .post(`/v4/projects/${project1.id}/members/`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .expect('Content-Type', /json/)
          .expect(400)
          .end((err2, res2) => {
            if (err2) {
              done(err);
            } else {
              res2.body.result.status.should.equal(400);
              done();
            }
          });
        }
      });
    });

    it('should return 201 and register customer member', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        get: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: [{
                roleName: USER_ROLE.MANAGER,
              }],
            },
          },
        }),
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
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.role.should.equal('manager');
            resJson.isPrimary.should.be.truthy;
            resJson.projectId.should.equal(project1.id);
            resJson.userId.should.equal(40051334);
            server.services.pubsub.publish.calledWith('project.member.added').should.be.true;
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

      it('sends single BUS_API_EVENT.PROJECT_TEAM_UPDATED message when manager added', (done) => {
        const mockHttpClient = _.merge(testUtil.mockHttpClient, {
          get: () => Promise.resolve({
            status: 200,
            data: {
              id: 'requesterId',
              version: 'v3',
              result: {
                success: true,
                status: 200,
                content: [{
                  roleName: USER_ROLE.MANAGER,
                }],
              },
            },
          }),
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
        sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
        request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(201)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.calledTwice.should.be.true;
              createEventSpy.firstCall.calledWith(BUS_API_EVENT.MEMBER_JOINED_MANAGER);
              createEventSpy.secondCall.calledWith(BUS_API_EVENT.PROJECT_TEAM_UPDATED, sinon.match({
                projectId: project1.id,
                projectName: project1.name,
                projectUrl: `https://local.topcoder-dev.com/projects/${project1.id}`,
                userId: 40051334,
                initiatorUserId: 40051334,
              })).should.be.true;
              done();
            });
          }
        });
      });

      it('sends single BUS_API_EVENT.PROJECT_TEAM_UPDATED message when copilot added', (done) => {
        request(server)
        .post(`/v4/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
        })
        .expect(201)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            testUtil.wait(() => {
              createEventSpy.calledTwice.should.be.true;
              createEventSpy.firstCall.calledWith(BUS_API_EVENT.MEMBER_JOINED_COPILOT);
              createEventSpy.secondCall.calledWith(BUS_API_EVENT.PROJECT_TEAM_UPDATED, sinon.match({
                projectId: project1.id,
                projectName: project1.name,
                projectUrl: `https://local.topcoder-dev.com/projects/${project1.id}`,
                userId: 40051332,
                initiatorUserId: 40051332,
              })).should.be.true;
              done();
            });
          }
        });
      });
    });
  });
});
