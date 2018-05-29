/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';
import server from '../../app';
import models from '../../models';
import testUtil from '../../tests/util';

const should = chai.should();

const body = {
  name: 'test project phase',
  status: 'active',
  startDate: '2018-05-15T00:00:00Z',
  endDate: '2018-05-15T12:00:00Z',
  budget: 20.0,
  progress: 1.23456,
  details: {
    message: 'This can be any json',
  },
};

describe('Project Phases', () => {
  let projectId;
  before((done) => {
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
          }).then((p) => {
            projectId = p.id;
            // create members
            models.ProjectMember.create({
              userId: 40051332,
              projectId,
              role: 'copilot',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1,
            }).then(() => done());
          });
        });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects/{id}/phases/', () => {
    it('should return 403 if user does not have permissions', (done) => {
      request(server)
          .post(`/v4/projects/${projectId}/phases/`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.member}`,
          })
          .send({ param: body })
          .expect('Content-Type', /json/)
          .expect(403, done);
    });

    it('should return 422 when name not provided', (done) => {
      const reqBody = _.cloneDeep(body);
      delete reqBody.name;
      request(server)
        .post(`/v4/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: reqBody })
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 when status not provided', (done) => {
      const reqBody = _.cloneDeep(body);
      delete reqBody.status;
      request(server)
        .post(`/v4/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: reqBody })
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 when startDate > endDate', (done) => {
      const reqBody = _.cloneDeep(body);
      reqBody.startDate = '2018-05-16T12:00:00';
      request(server)
        .post(`/v4/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: reqBody })
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 when budget is negative', (done) => {
      const reqBody = _.cloneDeep(body);
      reqBody.budget = -20;
      request(server)
        .post(`/v4/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: reqBody })
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 when progress is negative', (done) => {
      const reqBody = _.cloneDeep(body);
      reqBody.progress = -20;
      request(server)
        .post(`/v4/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: reqBody })
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 404 when project is not found', (done) => {
      request(server)
        .post('/v4/projects/99999/phases/')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 201 if payload is valid', (done) => {
      request(server)
        .post(`/v4/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.name.should.be.eql(body.name);
            resJson.status.should.be.eql(body.status);
            resJson.budget.should.be.eql(body.budget);
            resJson.progress.should.be.eql(body.progress);
            resJson.details.should.be.eql(body.details);
            done();
          }
        });
    });
  });
});
