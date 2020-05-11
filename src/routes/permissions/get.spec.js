/* eslint-disable no-unused-expressions */
/**
 * Tests for get.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

chai.should();

describe('GET permissions', () => {
  let projectId;
  let templateId;

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

  const permissions = [
    {
      policy: 'work.create',
      permission: {
        allowRule: {
          projectRoles: ['customer', 'copilot'],
          topcoderRoles: ['Connect Manager', 'administrator'],
        },
        denyRule: { projectRoles: ['copilot'] },
      },
      createdBy: 1,
      updatedBy: 1,
    },
    {
      policy: 'work.edit',
      permission: {
        allowRule: {
          projectRoles: ['copilot'],
          topcoderRoles: ['Connect Manager'],
        },
        denyRule: { topcoderRoles: ['Connect Admin'] },
      },
      createdBy: 1,
      updatedBy: 1,
    },
  ];

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => {
        models.ProjectTemplate.create({
          name: 'template 2',
          key: 'key 2',
          category: 'category 2',
          icon: 'http://example.com/icon1.ico',
          question: 'question 2',
          info: 'info 2',
          aliases: ['key-2', 'key_2'],
          scope: {},
          phases: {},
          createdBy: 1,
          updatedBy: 2,
        })
          .then((t) => {
            templateId = t.id;
            // Create projects
            models.Project.create({
              type: 'generic',
              billingAccountId: 1,
              name: 'test1',
              description: 'test project1',
              status: 'draft',
              templateId,
              details: {},
              createdBy: 1,
              updatedBy: 1,
              lastActivityAt: 1,
              lastActivityUserId: '1',
            })
              .then((project) => {
                projectId = project.id;
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
                  const newPermissions = _.map(permissions, p => _.assign({}, p, { projectTemplateId: templateId }));
                  models.WorkManagementPermission.bulkCreate(newPermissions, { returning: true })
                    .then(() => done());
                });
              });
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/{projectId}/permissions', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/permissions`)
        .expect(403, done);
    });

    it('should return 403 for non-member', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/permissions`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed project', (done) => {
      request(server)
        .get('/v5/projects/9999/permissions')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 200 for project with no template', (done) => {
      models.Project.create({
        type: 'generic',
        name: 'test1',
        status: 'draft',
        createdBy: 1,
        updatedBy: 1,
        lastActivityAt: 1,
        lastActivityUserId: '1',
      })
        .then((p) => {
          request(server)
            .get(`/v5/projects/${p.id}/permissions`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(200)
            .end((err, res) => {
              const resJson = res.body;
              resJson.should.be.empty;
              done();
            });
        });
    });

    it('should return 200 for connect admin - no permission', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/permissions`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.not.have.all.keys(permissions[0].policy, permissions[1].policy);
          done();
        });
    });

    it('should return 200 for copilot - has both no-permission and permission', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/permissions`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.all.keys(permissions[1].policy);
          resJson.should.not.have.all.keys(permissions[0].policy);
          done();
        });
    });

    it('should return 200 for admin - has both permission and no-permission', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/permissions`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.all.keys(permissions[0].policy);
          resJson.should.not.have.all.keys(permissions[1].policy);
          done();
        });
    });

    it('should return 200 for manager - has permissions', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/permissions`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.all.keys(permissions[0].policy, permissions[1].policy);
          done();
        });
    });
  });
});
