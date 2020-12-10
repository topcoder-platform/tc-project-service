/**
 * Tests for update.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('UPDATE Work Stream', () => {
  let projectId;
  let id;
  let workStream;

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
          .then((template) => {
            models.WorkManagementPermission.create({
              policy: 'workStream.edit',
              permission: {
                allowRule: { projectRoles: ['manager', 'copilot'], topcoderRoles: ['Connect Admin', 'administrator'] },
                denyRule: { projectRoles: ['copilot'] },
              },
              projectTemplateId: template.id,
              details: {},
              createdBy: 1,
              updatedBy: 1,
              lastActivityAt: 1,
              lastActivityUserId: '1',
            })
              .then(() => {
                // Create project
                models.Project.create({
                  type: 'generic',
                  billingAccountId: 1,
                  name: 'test1',
                  description: 'test project1',
                  status: 'draft',
                  templateId: template.id,
                  details: {},
                  createdBy: 1,
                  updatedBy: 1,
                  lastActivityAt: 1,
                  lastActivityUserId: '1',
                })
                  .then((project) => {
                    projectId = project.id;
                    models.WorkStream.create({
                      name: 'Work Stream',
                      type: 'generic',
                      status: 'active',
                      projectId,
                      createdBy: 1,
                      updatedBy: 1,
                    }).then((entity) => {
                      id = entity.id;
                      workStream = entity;
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

  describe('PATCH /projects/{projectId}/workstreams/{id}', () => {
    const body = {
      name: 'Work Stream',
      type: 'generic',
      status: 'active',
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/${id}`)
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/${id}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/${id}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed work stream', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/1234`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 404 for deleted work stream', (done) => {
      models.WorkStream.destroy({ where: { id } })
        .then(() => {
          request(server)
            .patch(`/v5/projects/${projectId}/workstreams/${id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(body)
            .expect(404, done);
        });
    });

    it('should return 200 for admin name updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.type;
      delete partialBody.status;
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.id.should.be.eql(id);
          resJson.name.should.be.eql(workStream.name);
          resJson.type.should.be.eql(workStream.type);
          resJson.status.should.be.eql(workStream.status);
          resJson.projectId.should.be.eql(workStream.projectId);
          resJson.createdBy.should.be.eql(workStream.createdBy);
          resJson.createdBy.should.be.eql(workStream.createdBy);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin all fields updated', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.id.should.be.eql(id);
          resJson.name.should.be.eql(workStream.name);
          resJson.type.should.be.eql(workStream.type);
          resJson.status.should.be.eql(workStream.status);
          resJson.projectId.should.be.eql(workStream.projectId);
          resJson.createdBy.should.be.eql(workStream.createdBy);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .patch(`/v5/projects/${projectId}/workstreams/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.id.should.be.eql(id);
          resJson.name.should.be.eql(workStream.name);
          resJson.type.should.be.eql(workStream.type);
          resJson.status.should.be.eql(workStream.status);
          resJson.projectId.should.be.eql(workStream.projectId);
          resJson.createdBy.should.be.eql(workStream.createdBy);
          resJson.updatedBy.should.be.eql(40051336); // connect admin
          done();
        });
    });
  });
});
