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
  spentBudget: 10.0,
  duration: 10,
  details: {
    message: 'This can be any json',
  },
};

const validatePhase = (resJson, expectedPhase) => {
  should.exist(resJson);
  resJson.name.should.be.eql(expectedPhase.name);
  resJson.status.should.be.eql(expectedPhase.status);
  resJson.budget.should.be.eql(expectedPhase.budget);
  resJson.progress.should.be.eql(expectedPhase.progress);
  resJson.details.should.be.eql(expectedPhase.details);
};

describe('Project Phases', () => {
  let projectId;
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
          }]).then(() => done());
        });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects/{id}/phases/', () => {
    it('should return 403 if user does not have permissions (non team member)', (done) => {
      request(server)
        .post(`/v4/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 403 if user does not have permissions (customer)', (done) => {
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
            validatePhase(resJson, body);
            done();
          }
        });
    });

    it('should return 201 if payload is valid (0 for non negative numbers)', (done) => {
      const bodyWithZeros = _.cloneDeep(body);
      bodyWithZeros.duration = 0;
      bodyWithZeros.spentBudget = 0.0;
      bodyWithZeros.budget = 0.0;
      bodyWithZeros.progress = 0.0;
      request(server)
        .post(`/v4/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: bodyWithZeros })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            validatePhase(resJson, bodyWithZeros);
            done();
          }
        });
    });

    it('should return 201 if payload has order specified', (done) => {
      request(server)
        .post(`/v4/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: _.assign({ order: 1 }, body) })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            validatePhase(resJson, body);
            resJson.order.should.be.eql(1);

            const firstPhaseId = resJson.id;

            // Create second phase
            request(server)
              .post(`/v4/projects/${projectId}/phases/`)
              .set({
                Authorization: `Bearer ${testUtil.jwts.copilot}`,
              })
              .send({ param: _.assign({ order: 1 }, body) })
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err2, res2) => {
                const resJson2 = res2.body.result.content;
                validatePhase(resJson2, body);
                resJson2.order.should.be.eql(1);

                models.ProjectPhase.findOne({ where: { id: firstPhaseId } })
                  .then((firstPhase) => {
                    firstPhase.order.should.be.eql(2);
                    done();
                  });
              });
          }
        });
    });
  });
});
