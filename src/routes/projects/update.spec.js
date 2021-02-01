/* eslint-disable no-unused-expressions */
import config from 'config';
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

import busApi from '../../services/busApi';

import {
  PROJECT_STATUS,
  BUS_API_EVENT,
  CONNECT_NOTIFICATION_EVENT,
} from '../../constants';

const should = chai.should();

describe('Project', () => {
  let project1;
  let project2;
  let project3;
  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => testUtil.clearES())
      .then(() => models.ProjectType.bulkCreate([
        {
          key: 'generic',
          displayName: 'Generic',
          icon: 'http://example.com/icon1.ico',
          question: 'question 1',
          info: 'info 1',
          aliases: ['key-1', 'key_1'],
          createdBy: 1,
          updatedBy: 1,
          metadata: {},
        },
      ]))
      .then(() => done());
  });

  after((done) => {
    testUtil.clearDb(done);
  });
  describe('PATCH /projects', () => {
    const body = {
      name: 'updatedProject name',
      type: 'generic',
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
        lastActivityAt: 1,
        lastActivityUserId: '1',
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
        lastActivityAt: 1,
        lastActivityUserId: '1',
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
        lastActivityAt: 1,
        lastActivityUserId: '1',
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
        .patch(`/v5/projects/${project1.id}`)
        .send(body)
        .expect(403, done);
    });

    it('should return 400 if update completed project', (done) => {
      request(server)
        .patch(`/v5/projects/${project2.id}`)
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
            res.body.message.should.equal('Unable to update project');
            done();
          }
        });
    });

    it('should return 200 if topcoder manager user will update a project', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          status: 'active',
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(done);
    });

    it('should return the project using M2M token with "write:projects" scope', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.m2m['write:projects']}`,
        })
        .send({
          name: 'updateProject name by M2M',
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.name.should.equal('updateProject name by M2M');
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(config.DEFAULT_M2M_USERID);
            done();
          }
        });
    });

    it('should return 200 if valid user and data', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}`)
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
            resJson.name.should.equal('updatedProject name');
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051332);
            done();
          }
        });
    });

    it('should return 200 and project history should be updated (status is not set)', (done) => {
      const mbody = {

        name: 'updatedProject name',
        status: PROJECT_STATUS.IN_REVIEW,
      };
      request(server)
        .patch(`/v5/projects/${project1.id}`)
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
            const resJson = res.body;
            should.exist(resJson);
            resJson.name.should.equal('updatedProject name');
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051332);
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
        name: 'updatedProject name',
        status: PROJECT_STATUS.DRAFT,
      };
      request(server)
        .patch(`/v5/projects/${project1.id}`)
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
            const resJson = res.body;
            should.exist(resJson);
            resJson.name.should.equal('updatedProject name');
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051332);
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

    it('should return 400 as cancel reason is mandatory if project status is cancelled', (done) => {
      const mbody = {
        name: 'updatedProject name',
        status: PROJECT_STATUS.CANCELLED,
      };
      request(server)
        .patch(`/v5/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(mbody)
        .expect('Content-Type', /json/)
        .expect(400)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            res.body.message.should.equal('validation error: "cancelReason" is required');
            done();
          }
        });
    });

    it('should return 400 if project type does not exist', (done) => {
      const mbody = {
        type: 'not_exist',
      };
      request(server)
        .patch(`/v5/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(mbody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 200 and project history should be updated for cancelled project', (done) => {
      const mbody = {
        name: 'updatedProject name',
        status: PROJECT_STATUS.CANCELLED,
        cancelReason: 'price/cost',
      };
      request(server)
        .patch(`/v5/projects/${project1.id}`)
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
            const resJson = res.body;
            should.exist(resJson);
            resJson.name.should.equal('updatedProject name');
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051332);
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
            name: 'updatedProject name',
            status: PROJECT_STATUS.ACTIVE,
          };
          request(server)
            .patch(`/v5/projects/${project1.id}`)
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
                const resJson = res.body;
                should.exist(resJson);
                resJson.name.should.equal('updatedProject name');
                resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
                resJson.updatedBy.should.equal(40051334);
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
            name: 'updatedProject name',
            status: PROJECT_STATUS.ACTIVE,

          };
          request(server)
            .patch(`/v5/projects/${project1.id}`)
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
                const resJson = res.body;
                should.exist(resJson);
                resJson.name.should.equal('updatedProject name');
                resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
                resJson.updatedBy.should.equal(40051333);
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

    it('should return 200 and project history should not be updated', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}`)
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
            resJson.name.should.equal('updatedProject name');
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051332);
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

    it('should return 200 and sync new billing account id', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          billingAccountId: 123,

        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.billingAccountId.should.equal(123);
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051334);
            done();
          }
        });
    });

    it('should return 200 and not sync same billing account id', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          billingAccountId: 1,

        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.billingAccountId.should.equal(1);
            resJson.billingAccountId.should.equal(1);
            done();
          }
        });
    });

    it('should return 200 and not sync same billing account id for project without direct project id', (done) => {
      request(server)
        .patch(`/v5/projects/${project3.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({
          billingAccountId: 1,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.billingAccountId.should.equal(1);
            resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
            resJson.updatedBy.should.equal(40051333);
            done();
          }
        });
    });

    xit('should return 400 when updating billingAccountId without "write:projects-billing-accounts" scope in M2M token',
      (done) => {
        request(server)
          .patch(`/v5/projects/${project1.id}`)
          .set({
            Authorization: `Bearer ${testUtil.m2m['write:projects']}`,
          })
          .send({
            billingAccountId: 123,
          })
          .expect('Content-Type', /json/)
          .expect(400, done);
      });

    it.skip('should return 200 and update bookmarks', (done) => {
      request(server)
        .patch(`/v5/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          bookmarks: [{
            title: 'title1',
            address: 'address1',
          }],
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            let resJson = res.body;
            should.exist(resJson);
            resJson.bookmarks.should.have.lengthOf(1);
            resJson.bookmarks[0].title.should.be.eql('title1');
            resJson.bookmarks[0].address.should.be.eql('address1');
            request(server)
              .patch(`/v5/projects/${project1.id}`)
              .set({
                Authorization: `Bearer ${testUtil.jwts.copilot}`,
              })
              .send({
                bookmarks: null,

              })
              .expect('Content-Type', /json/)
              .expect(200)
              .end((error, resp) => {
                if (error) {
                  done(error);
                } else {
                  resJson = resp.body;
                  should.exist(resJson);
                  should.not.exist(resJson.bookmarks);
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

              name: 'updatedProject name',
              status: PROJECT_STATUS.ACTIVE,

            };
            request(server)
              .patch(`/v5/projects/${project1.id}`)
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
                  const resJson = res.body;
                  should.exist(resJson);
                  resJson.name.should.equal('updatedProject name');
                  resJson.updatedAt.should.not.equal('2016-06-30 00:33:07+00');
                  resJson.updatedBy.should.equal(40051333);
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

    describe('Bus api', () => {
      let createEventSpy;

      before((done) => {
        // Wait for 500ms in order to wait for createEvent calls from previous tests to complete
        testUtil.wait(done);
      });

      beforeEach(() => {
        createEventSpy = sandbox.spy(busApi, 'createEvent');
      });

      it('should send correct BUS API messages when project status updated', (done) => {
        request(server)
          .patch(`/v5/projects/${project1.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            status: PROJECT_STATUS.COMPLETED,
          })
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.equal(3);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_UPDATED, sinon.match({
                  resource: 'project',
                  id: project1.id,
                  status: PROJECT_STATUS.COMPLETED,
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_COMPLETED).should.be.true;
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_UPDATED, sinon.match({
                  projectId: project1.id,
                  projectName: project1.name,
                  projectUrl: `https://local.topcoder-dev.com/projects/${project1.id}`,
                  userId: 40051333,
                  initiatorUserId: 40051333,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when project details updated', (done) => {
        request(server)
          .patch(`/v5/projects/${project1.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            details: {
              info: 'something',
            },
          })
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.equal(3);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_UPDATED, sinon.match({
                  resource: 'project',
                  id: project1.id,
                  details: { info: 'something' },
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_SPECIFICATION_MODIFIED).should.be.true;
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_UPDATED, sinon.match({
                  projectId: project1.id,
                  projectName: project1.name,
                  projectUrl: `https://local.topcoder-dev.com/projects/${project1.id}`,
                  userId: 40051333,
                  initiatorUserId: 40051333,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when project name updated', (done) => {
        request(server)
          .patch(`/v5/projects/${project1.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            name: 'New project name',
          })
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.equal(3);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_UPDATED, sinon.match({
                  resource: 'project',
                  id: project1.id,
                  name: 'New project name',
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_SPECIFICATION_MODIFIED).should.be.true;
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_UPDATED, sinon.match({
                  projectId: project1.id,
                  projectName: 'New project name',
                  projectUrl: `https://local.topcoder-dev.com/projects/${project1.id}`,
                  userId: 40051333,
                  initiatorUserId: 40051333,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when project description updated', (done) => {
        request(server)
          .patch(`/v5/projects/${project1.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            description: 'Updated description',
          })
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.equal(3);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_UPDATED, sinon.match({
                  resource: 'project',
                  id: project1.id,
                  description: 'Updated description',
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_SPECIFICATION_MODIFIED).should.be.true;
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_UPDATED, sinon.match({
                  projectId: project1.id,
                  projectName: project1.name,
                  projectUrl: `https://local.topcoder-dev.com/projects/${project1.id}`,
                  userId: 40051333,
                  initiatorUserId: 40051333,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when project bookmarks updated', (done) => {
        request(server)
          .patch(`/v5/projects/${project1.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            bookmarks: [{
              title: 'title1',
              address: 'http://someurl.com',
            }],
          })
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.equal(3);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_UPDATED, sinon.match({
                  resource: 'project',
                  id: project1.id,
                  bookmarks: [{ title: 'title1', address: 'http://someurl.com' }],
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_LINK_CREATED).should.be.true;
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.PROJECT_UPDATED, sinon.match({
                  projectId: project1.id,
                  projectName: project1.name,
                  projectUrl: `https://local.topcoder-dev.com/projects/${project1.id}`,
                  userId: 40051333,
                  initiatorUserId: 40051333,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when project estimatedPrice updated', (done) => {
        request(server)
          .patch(`/v5/projects/${project1.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            estimatedPrice: 123,
          })
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.equal(1);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_UPDATED, sinon.match({
                  resource: 'project',
                  id: project1.id,
                  // FIXME https://github.com/sequelize/sequelize/issues/8019
                  // estimatedPrice: 123,
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when project actualPrice updated', (done) => {
        request(server)
          .patch(`/v5/projects/${project1.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            actualPrice: 123,
          })
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.equal(1);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_UPDATED, sinon.match({
                  resource: 'project',
                  id: project1.id,
                  // FIXME https://github.com/sequelize/sequelize/issues/8019
                  // actualPrice: 123,
                  updatedBy: testUtil.userIds.admin,
                })).should.be.true;

                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when project terms are updated', (done) => {
        request(server)
          .patch(`/v5/projects/${project1.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({
            terms: ['1', '2', '3'],
          })
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.equal(1);

                createEventSpy.calledWith(BUS_API_EVENT.PROJECT_UPDATED, sinon.match({
                  resource: 'project',
                  id: project1.id,
                  terms: ['1', '2', '3'],
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
