/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';

import models from '../../models';
import util from '../../util';
import server from '../../app';
import testUtil from '../../tests/util';
import { USER_ROLE } from '../../constants';

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
        .post(`/v5/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 201 when invited then accepted and then 404 if user is already as a member', (done) => {
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
      .post(`/v5/projects/${project1.id}/members/invite`)
      .set({
        Authorization: `Bearer ${testUtil.jwts.admin}`,
      })
      .send({
        userIds: [40051332],
        role: 'copilot',
      })
      .expect('Content-Type', /json/)
      .expect(201)
      .end((err, res) => {
        if (err) {
          done(err);
        } else {
          const resJson = res.body.success[0];
          should.exist(resJson);
          resJson.role.should.equal('copilot');
          resJson.projectId.should.equal(project1.id);
          resJson.userId.should.equal(40051332);
          server.services.pubsub.publish.calledWith('project.member.invite.created').should.be.true;
          request(server)
          .put(`/v5/projects/${project1.id}/members/invite`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
          })
          .send({
            userId: 40051332,
            status: 'accepted',
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err2, res2) => {
            if (err2) {
              done(err2);
            } else {
              const resJson2 = res2.body;
              should.exist(resJson2);
              resJson2.role.should.equal('copilot');
              resJson2.projectId.should.equal(project1.id);
              resJson2.userId.should.equal(40051332);
              server.services.pubsub.publish.calledWith('project.member.invite.updated').should.be.true;
              server.services.pubsub.publish.calledWith('project.member.added').should.be.true;

              request(server)
                .put(`/v5/projects/${project1.id}/members/invite`)
                .set({
                  Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
                })
                .send({
                  userId: 40051332,
                  status: 'accepted',
                })
                .expect('Content-Type', /json/)
                .expect(404)
                .end((err3, res3) => {
                  if (err3) {
                    done(err3);
                  } else {
                    const errorMessage = _.get(res3.body, 'message', '');
                    sinon.assert.match(errorMessage, /.*invite not found for project id 1, email undefined and userId/);
                    done();
                  }
                });
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
        .post(`/v5/projects/${project1.id}/members/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
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
  });
});
