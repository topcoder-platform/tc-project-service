/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';

import models from '../../models';
import util from '../../util';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('Project members delete', () => {
  let project1;
  let member1;
  let member2;
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
        }).then((p) => {
          project1 = p;
          // create members
          return models.ProjectMember.create({
            userId: 40051332,
            projectId: project1.id,
            role: 'copilot',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          }).then((pm) => {
            member1 = pm;
            return models.ProjectMember.create({
              userId: 40051334,
              projectId: project1.id,
              role: 'manager',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1,
            }).then((pm2) => {
              member2 = pm2;
              done();
            });
          });
        });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('DELETE /projects/{id}/members/{id}', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should return 403 if user does not have permissions', (done) => {
      request(server)
        .delete(`/v4/projects/${project1.id}/members/${member1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send({
          param: {
            userId: 1,
            projectId: project1.id,
            role: 'customer',
          },
        })
        .expect(403, done);
    });

    it('should return 403 if user not found', (done) => {
      request(server)
        .delete(`/v4/projects/${project1.id}/members/8888888`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({
          param: {
            userId: 1,
            projectId: project1.id,
            role: 'customer',
          },
        })
        .expect(403, done);
    });

    it('should return 204 if copilot user has access to the project', (done) => {
      request(server)
        .delete(`/v4/projects/${project1.id}/members/${member1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(204)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            const removedMember = {
              projectId: project1.id,
              userId: 40051332,
              role: 'copilot',
              isPrimary: true,
            };
            server.services.pubsub.publish.calledWith('project.member.removed',
              sinon.match(removedMember)).should.be.true;
            done();
          }

          // models.ProjectMember
          //     .count({where: { projectId: project1.id, deletedAt: { $eq: null } }})
          //     .then(count=>{
          //       console.log(JSON.stringify(count, null, 2))
          //       count.length.should.equal(1)
          //       done()
          //     })
          //     .catch(err=>done(err))
        });
    });

    it('should return 204 if copilot is removed (promote the next copilot to primary)', (done) => {
      models.ProjectMember.bulkCreate([{
        userId: 40051331,
        projectId: project1.id,
        role: 'copilot',
        isPrimary: false,
        createdBy: 1,
        updatedBy: 1,
        createdAt: '2016-06-30 00:33:07+00',
        updatedAt: '2016-06-30 00:33:07+00',
      }, {
        userId: 40051333,
        projectId: project1.id,
        role: 'copilot',
        isPrimary: false,
        createdBy: 1,
        updatedBy: 1,
        createdAt: '2016-07-30 00:33:07+00',
        updatedAt: '2016-07-30 00:33:07+00',
      }, {
        userId: 40051335,
        projectId: project1.id,
        role: 'copilot',
        isPrimary: false,
        createdBy: 1,
        updatedBy: 1,
        createdAt: '2016-08-30 00:33:07+00',
        updatedAt: '2016-08-30 00:33:07+00',
      }]).then(() => {
        request(server)
          .delete(`/v4/projects/${project1.id}/members/${member1.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .expect(204)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              const removedMember = {
                projectId: project1.id,
                userId: 40051332,
                role: 'copilot',
                isPrimary: true,
              };
              server.services.pubsub.publish.calledWith('project.member.removed',
                sinon.match(removedMember)).should.be.true;
              // validate the primary copilot
              models.ProjectMember.findAll({
                paranoid: true,
                where: {
                  projectId: project1.id,
                  role: 'copilot',
                  isPrimary: true,
                },
              })
                .then((members) => {
                  should.exist(members);
                  members.length.should.equal(1);
                  const plain = members[0].get({
                    plain: true,
                  });
                  plain.role.should.equal('copilot');
                  plain.isPrimary.should.equal(true);
                  plain.userId.should.equal(40051331);
                  done();
                });
            }
          });
      });
    });

    it('should return 204 if manager is removed from the project', (done) => {
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
        .delete(`/v4/projects/${project1.id}/members/${member2.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(204)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            const removedMember = {
              projectId: project1.id,
              userId: 40051334,
              role: 'manager',
              isPrimary: true,
            };
            server.services.pubsub.publish.calledWith('project.member.removed',
              sinon.match(removedMember)).should.be.true;
            postSpy.should.have.been.calledOnce;
            done();
          }
        });
    });

    it('should return 204 if manager is removed from the project (without direct project id)', (done) => {
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
      models.Project.update({
        directProjectId: null,
      }, {
        where: {
          id: project1.id,
        },
      })
        .then(() => {
          request(server)
            .delete(`/v4/projects/${project1.id}/members/${member2.id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.manager}`,
            })
            .expect(204)
            .end((err) => {
              if (err) {
                done(err);
              } else {
                const removedMember = {
                  projectId: project1.id,
                  userId: 40051334,
                  role: 'manager',
                  isPrimary: true,
                };
                server.services.pubsub.publish.calledWith('project.member.removed',
                  sinon.match(removedMember)).should.be.true;
                postSpy.should.not.have.been.calledOnce;
                done();
              }
            });
        });
    });

    it('should return 403 if copilot user is trying to remove a manager', (done) => {
      request(server)
        .delete(`/v4/projects/${project1.id}/members/${member2.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });
  });
});
