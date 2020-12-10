/**
 * Tests for create.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';

import server from '../../app';
import testUtil from '../../tests/util';
import models from '../../models';

const should = chai.should();

describe('CREATE work stream', () => {
  const templates = [
    {
      name: 'template 1',
      key: 'key 1',
      category: 'category 1',
      icon: 'http://example.com/icon1.ico',
      question: 'question 1',
      info: 'info 1',
      aliases: ['key-1', 'key_1'],
      disabled: true,
      hidden: true,
      scope: {
        scope1: {
          subScope1A: 1,
          subScope1B: 2,
        },
        scope2: [1, 2, 3],
      },
      phases: {
        phase1: {
          name: 'phase 1',
          details: {
            anyDetails: 'any details 1',
          },
          others: ['others 11', 'others 12'],
        },
        phase2: {
          name: 'phase 2',
          details: {
            anyDetails: 'any details 2',
          },
          others: ['others 21', 'others 22'],
        },
      },
      createdBy: 1,
      updatedBy: 1,
    },
    {
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
    },
  ];

  let projectId;

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => {
        models.ProjectTemplate.bulkCreate(templates, { returning: true })
          .then((t) => {
            // Create projects
            models.Project.create({
              type: 'generic',
              billingAccountId: 1,
              name: 'test1',
              description: 'test project1',
              status: 'draft',
              templateId: t[0].id,
              details: {},
              createdBy: 1,
              updatedBy: 1,
              lastActivityAt: 1,
              lastActivityUserId: '1',
            })
              .then((project) => {
                projectId = project.id;
              })
              .then(() => done());
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects/{projectId}/workstreams', () => {
    const body = {
      name: 'Work Stream',
      type: 'generic',
      status: 'active',
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/workstreams`)
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/workstreams`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 404 for non-existed project id', (done) => {
      request(server)
        .delete('/v5/projects/999/workstreams')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted type', (done) => {
      models.Project.destroy({ where: { id: projectId } })
        .then(() => {
          request(server)
            .delete(`/v5/projects/${projectId}/workstreams`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/workstreams`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/workstreams`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 400 for missing type', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.type;

      request(server)
        .post(`/v5/projects/${projectId}/workstreams`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 for missing name', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.name;

      request(server)
        .post(`/v5/projects/${projectId}/workstreams`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 for status', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.status;

      request(server)
        .post(`/v5/projects/${projectId}/workstreams`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 201 for admin', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/workstreams`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          resJson.name.should.be.eql(body.name);
          resJson.type.should.be.eql(body.type);
          resJson.status.should.be.eql(body.status);
          resJson.projectId.should.be.eql(projectId);

          resJson.createdBy.should.be.eql(40051333);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 201 for connect admin', (done) => {
      request(server)
        .post(`/v5/projects/${projectId}/workstreams`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          resJson.name.should.be.eql(body.name);
          resJson.type.should.be.eql(body.type);
          resJson.status.should.be.eql(body.status);
          resJson.projectId.should.be.eql(projectId);
          resJson.createdBy.should.be.eql(40051336);
          resJson.updatedBy.should.be.eql(40051336);
          done();
        });
    });
  });
});
