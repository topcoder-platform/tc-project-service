/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import util from '../../util';
import {
  PROJECT_STATUS,
} from '../../constants';

const should = chai.should();

describe('Project', () => {
  let project1;
  let project2;
  let project3;
  beforeEach((done) => {
    testUtil.clearDb(done);
  });

  after((done) => {
    testUtil.clearDb(done);
  });
  describe('PATCH /projects', () => {
    const body = {
      param: {
        name: 'updatedProject name',
      },
    };
    let sandbox;
    afterEach(() => {
      sandbox.restore();
    });
    beforeEach((done) => {
      sandbox = sinon.sandbox.create();
      models.Project.bulkCreate([{
        type: 'generic',
        directProjectId: 1,
        billingAccountId: 1,
        name: 'test1',
        description: 'test project1',
        status: 'draft',
        details: {},
        createdBy: 1,
        updatedBy: 1,
        createdAt: '2016-06-30 00:33:07+00',
        updatedAt: '2016-06-30 00:33:07+00',
      }, {
        type: 'generic',
        billingAccountId: 2,
        name: 'test2',
        description: 'test project2',
        status: 'completed',
        details: {},
        createdBy: 1,
        updatedBy: 1,
        createdAt: '2016-06-30 00:33:07+00',
        updatedAt: '2016-06-30 00:33:07+00',
      }, {
        type: 'generic',
        name: 'test3',
        description: 'test project3',
        status: 'draft',
        details: {},
        createdBy: 1,
        updatedBy: 1,
        createdAt: '2016-06-30 00:33:07+00',
        updatedAt: '2016-06-30 00:33:07+00',
      }])
        .then(() => models.Project.findAll())
        .then((projects) => {
          project1 = projects[0];
          project2 = projects[1];
          project3 = projects[2];
          return models.ProjectMember.bulkCreate([{
            projectId: project1.id,
            role: 'copilot',
            userId: 40051332,
            createdBy: 1,
            updatedBy: 1,
          }, {
            projectId: project1.id,
            role: 'manager',
            userId: 40051334,
            createdBy: 1,
            updatedBy: 1,
          }, {
            projectId: project2.id,
            role: 'copilot',
            userId: 40051332,
            createdBy: 1,
            updatedBy: 1,
          }]);
        }).then(() => done());
    });

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch(`/v4/projects/${project1.id}`)
        .send(body)
        .expect(403, done);
    });

    it('should return 400 if update completed project', (done) => {
      request(server)
        .patch(`/v4/projects/${project2.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(400)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const result = res.body.result;
            result.success.should.be.false;
            result.status.should.equal(400);
            result.content.message.should.equal('Unable to update project');
            done();
          }
        });
    });

    it('should return 403 if invalid user will update a project', (done) => {
      request(server)
        .patch(`/v4/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            status: 'active',
          },
        })
        .expect('Content-Type', /json/)
        .expect(403)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const result = res.body.result;
            result.success.should.be.false;
            result.status.should.equal(403);
            result.content.message.should.equal('Only assigned topcoder-managers or topcoder admins' +
              ' should be allowed to launch a project');
            done();
          }
        });
    });

    it('should return 200 if topcoder manager user will update a project', (done) => {
      request(server)
        .patch(`/v4/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          param: {
            status: 'active',
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const result = res.body.result;
            result.success.should.be.true;
            result.status.should.equal(200);
            result.content.status.should.equal('active');
            server.services.pubsub.publish.calledWith('project.updated').should.be.true;
            done();
          }
        });
    });

    it('should return 200 if valid user and data', (done) => {
      request(server)
        .patch(`/v4/projects/${project1.id}`)
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
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.name.should.equal('updatedProject name');
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051332);
            server.services.pubsub.publish.calledWith('project.updated').should.be.true;
            done();
          }
        });
    });

    it('should return 200 and project history should be updated (status is not set)', (done) => {
      const mbody = {
        param: {
          name: 'updatedProject name',
          status: PROJECT_STATUS.IN_REVIEW,
        },
      };
      request(server)
        .patch(`/v4/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(mbody)
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.name.should.equal('updatedProject name');
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051332);
            server.services.pubsub.publish.calledWith('project.updated').should.be.true;
            // validate that project history is updated
            models.ProjectHistory.findAll({
              limit: 1,
              where: {
                projectId: project1.id,
              },
              order: [
                ['createdAt', 'DESC'],
              ],
            }).then((histories) => {
              should.exist(histories);
              histories.length.should.equal(1);
              const history = histories[0].get({
                plain: true,
              });
              history.status.should.equal(PROJECT_STATUS.IN_REVIEW);
              history.projectId.should.equal(project1.id);
              done();
            });
          }
        });
    });

    it('should return 200 and project history should not be updated (status is not updated)', (done) => {
      const mbody = {
        param: {
          name: 'updatedProject name',
          status: PROJECT_STATUS.DRAFT,
        },
      };
      request(server)
        .patch(`/v4/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(mbody)
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.name.should.equal('updatedProject name');
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051332);
            server.services.pubsub.publish.calledWith('project.updated').should.be.true;
            // validate that project history is not updated
            models.ProjectHistory.findAll({
              where: {
                projectId: project1.id,
              },
            }).then((histories) => {
              should.exist(histories);
              histories.length.should.equal(0);
              done();
            });
          }
        });
    });

    it('should return 422 as cancel reason is mandatory if project status is cancelled', (done) => {
      const mbody = {
        param: {
          name: 'updatedProject name',
          status: PROJECT_STATUS.CANCELLED,
        },
      };
      request(server)
        .patch(`/v4/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(mbody)
        .expect('Content-Type', /json/)
        .expect(422)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const result = res.body.result;
            result.success.should.be.false;
            result.status.should.equal(422);
            done();
          }
        });
    });

    it('should return 200 and project history should be updated for cancelled project', (done) => {
      const mbody = {
        param: {
          name: 'updatedProject name',
          status: PROJECT_STATUS.CANCELLED,
          cancelReason: 'price/cost',
        },
      };
      request(server)
        .patch(`/v4/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(mbody)
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.name.should.equal('updatedProject name');
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051332);
            server.services.pubsub.publish.calledWith('project.updated').should.be.true;
            // validate that project history is updated
            models.ProjectHistory.findAll({
              where: {
                projectId: project1.id,
              },
            }).then((histories) => {
              should.exist(histories);
              histories.length.should.equal(1);
              const history = histories[0].get({
                plain: true,
              });
              history.status.should.equal(PROJECT_STATUS.CANCELLED);
              history.projectId.should.equal(project1.id);
              history.cancelReason.should.equal('price/cost');
              done();
            });
          }
        });
    });

    it('should return 200, manager is allowed to transition project out of cancel status', (done) => {
      models.Project.update({
        status: PROJECT_STATUS.CANCELLED,
      }, {
        where: {
          id: project1.id,
        },
      })
        .then(() => {
          const mbody = {
            param: {
              name: 'updatedProject name',
              status: PROJECT_STATUS.ACTIVE,
            },
          };
          request(server)
            .patch(`/v4/projects/${project1.id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.manager}`,
            })
            .send(mbody)
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
              if (err) {
                done(err);
              } else {
                const resJson = res.body.result.content;
                should.exist(resJson);
                resJson.name.should.equal('updatedProject name');
                resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
                resJson.updatedBy.should.equal(40051334);
                server.services.pubsub.publish.calledWith('project.updated').should.be.true;
                // validate that project history is updated
                models.ProjectHistory.findAll({
                  where: {
                    projectId: project1.id,
                  },
                }).then((histories) => {
                  should.exist(histories);
                  histories.length.should.equal(1);
                  const history = histories[0].get({
                    plain: true,
                  });
                  history.status.should.equal(PROJECT_STATUS.ACTIVE);
                  history.projectId.should.equal(project1.id);
                  done();
                });
              }
            });
        });
    });

    it('should return 200, admin is allowed to transition project out of cancel status', (done) => {
      models.Project.update({
        status: PROJECT_STATUS.CANCELLED,
      }, {
        where: {
          id: project1.id,
        },
      })
        .then(() => {
          const mbody = {
            param: {
              name: 'updatedProject name',
              status: PROJECT_STATUS.ACTIVE,
            },
          };
          request(server)
            .patch(`/v4/projects/${project1.id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(mbody)
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
              if (err) {
                done(err);
              } else {
                const resJson = res.body.result.content;
                should.exist(resJson);
                resJson.name.should.equal('updatedProject name');
                resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
                resJson.updatedBy.should.equal(40051333);
                server.services.pubsub.publish.calledWith('project.updated').should.be.true;
                // validate that project history is updated
                models.ProjectHistory.findAll({
                  where: {
                    projectId: project1.id,
                  },
                }).then((histories) => {
                  should.exist(histories);
                  histories.length.should.equal(1);
                  const history = histories[0].get({
                    plain: true,
                  });
                  history.status.should.equal(PROJECT_STATUS.ACTIVE);
                  history.projectId.should.equal(project1.id);
                  done();
                });
              }
            });
        });
    });

    it('should return 403, copilot is not allowed to transition project out of cancel status', (done) => {
      models.Project.update({
        status: PROJECT_STATUS.CANCELLED,
      }, {
        where: {
          id: project1.id,
        },
      })
        .then(() => {
          const mbody = {
            param: {
              name: 'updatedProject name',
              status: PROJECT_STATUS.ACTIVE,
            },
          };
          request(server)
            .patch(`/v4/projects/${project1.id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.copilot}`,
            })
            .send(mbody)
            .expect('Content-Type', /json/)
            .expect(403)
            .end((err, res) => {
              if (err) {
                done(err);
              } else {
                const result = res.body.result;
                result.success.should.be.false;
                result.status.should.equal(403);
                done();
              }
            });
        });
    });

    it('should return 200 and project history should not be updated', (done) => {
      request(server)
        .patch(`/v4/projects/${project1.id}`)
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
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.name.should.equal('updatedProject name');
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051332);
            server.services.pubsub.publish.calledWith('project.updated').should.be.true;
            // validate that project history is not updated
            models.ProjectHistory.findAll({
              where: {
                projectId: project1.id,
              },
            }).then((histories) => {
              should.exist(histories);
              histories.length.should.equal(0);
              done();
            });
          }
        });
    });

    it('should return 500 if error to sync billing account id', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.reject(new Error('error message')),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .patch(`/v4/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            billingAccountId: 123,
          },
        })
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
            done();
          }
        });
    });

    it('should return 200 and sync new billing account id', (done) => {
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
                billingAccountName: '2',
              },
            },
          },
        }),
      });
      const postSpy = sinon.spy(mockHttpClient, 'post');
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .patch(`/v4/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            billingAccountId: 123,
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.billingAccountId.should.equal(123);
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051332);
            postSpy.should.have.been.calledOnce;
            server.services.pubsub.publish.calledWith('project.updated').should.be.true;
            done();
          }
        });
    });

    it('should return 200 and not sync same billing account id', (done) => {
      request(server)
        .patch(`/v4/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            billingAccountId: 1,
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.billingAccountId.should.equal(1);
            resJson.billingAccountId.should.equal(1);
            server.services.pubsub.publish.calledWith('project.updated').should.be.true;
            done();
          }
        });
    });

    it('should return 200 and not sync same billing account id for project without direct project id', (done) => {
      request(server)
        .patch(`/v4/projects/${project3.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({
          param: {
            billingAccountId: 1,
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.billingAccountId.should.equal(1);
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051333);
            server.services.pubsub.publish.calledWith('project.updated').should.be.true;
            done();
          }
        });
    });

    it.skip('should return 200 and update bookmarks', (done) => {
      request(server)
        .patch(`/v4/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            bookmarks: [{
              title: 'title1',
              address: 'address1',
            }],
          },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            let resJson = res.body.result.content;
            should.exist(resJson);
            resJson.bookmarks.should.have.lengthOf(1);
            resJson.bookmarks[0].title.should.be.eql('title1');
            resJson.bookmarks[0].address.should.be.eql('address1');
            request(server)
              .patch(`/v4/projects/${project1.id}`)
              .set({
                Authorization: `Bearer ${testUtil.jwts.copilot}`,
              })
              .send({
                param: {
                  bookmarks: null,
                },
              })
              .expect('Content-Type', /json/)
              .expect(200)
              .end((error, resp) => {
                if (error) {
                  done(error);
                } else {
                  resJson = resp.body.result.content;
                  should.exist(resJson);
                  should.not.exist(resJson.bookmarks);
                  server.services.pubsub.publish.calledWith('project.updated').should.be.true;
                  done();
                }
              });
          }
        });
    });

    xdescribe('for connect admin, ', () => {
      it('should return 200, connect admin is allowed to transition project out of cancel status', (done) => {
        models.Project.update({
          status: PROJECT_STATUS.CANCELLED,
        }, {
          where: {
            id: project1.id,
          },
        })
          .then(() => {
            const mbody = {
              param: {
                name: 'updatedProject name',
                status: PROJECT_STATUS.ACTIVE,
              },
            };
            request(server)
              .patch(`/v4/projects/${project1.id}`)
              .set({
                Authorization: `Bearer ${testUtil.jwts.admin}`,
              })
              .send(mbody)
              .expect('Content-Type', /json/)
              .expect(200)
              .end((err, res) => {
                if (err) {
                  done(err);
                } else {
                  const resJson = res.body.result.content;
                  should.exist(resJson);
                  resJson.name.should.equal('updatedProject name');
                  resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
                  resJson.updatedBy.should.equal(40051333);
                  server.services.pubsub.publish.calledWith('project.updated').should.be.true;
                  // validate that project history is updated
                  models.ProjectHistory.findAll({
                    where: {
                      projectId: project1.id,
                    },
                  }).then((histories) => {
                    should.exist(histories);
                    histories.length.should.equal(1);
                    const history = histories[0].get({
                      plain: true,
                    });
                    history.status.should.equal(PROJECT_STATUS.ACTIVE);
                    history.projectId.should.equal(project1.id);
                    done();
                  });
                }
              });
          });
      });
    });
  });
});
