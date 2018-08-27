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
  createdBy: 1,
  updatedBy: 1,
};

const updateBody = {
  name: 'test project phase xxx',
  status: 'inactive',
  startDate: '2018-05-11T00:00:00Z',
  endDate: '2018-05-12T12:00:00Z',
  budget: 123456.789,
  progress: 9.8765432,
  details: {
    message: 'This is another json',
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
  let phaseId;
  let phaseId2;
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
          }]).then(() => {
            _.assign(body, { projectId });
            const phases = [
              body,
              _.assign({ order: 1 }, body),
            ];
            models.ProjectPhase.bulkCreate(phases, { returning: true })
              .then((createdPhases) => {
                phaseId = createdPhases[0].id;
                phaseId2 = createdPhases[1].id;

                done();
              });
          });
        });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('PATCH /projects/{projectId}/phases/{phaseId}', () => {
    it('should return 403 if user does not have permissions (non team member)', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 403 if user does not have permissions (customer)', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 404 when no project with specific projectId', (done) => {
      request(server)
        .patch(`/v4/projects/999/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no phase with specific phaseId', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/999`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 422 when parameters are invalid', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          param: {
            progress: -15,
          },
        })
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 400 when startDate > endDate', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          param: {
            endDate: '2018-05-13T00:00:00Z',
          },
        })
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return updated phase when user have permission and parameters are valid', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            validatePhase(resJson, updateBody);
            done();
          }
        });
    });

    it('should return updated phase when parameters are valid (0 for non -ve numbers)', (done) => {
      const bodyWithZeros = _.cloneDeep(updateBody);
      bodyWithZeros.duration = 0;
      bodyWithZeros.spentBudget = 0.0;
      bodyWithZeros.budget = 0.0;
      bodyWithZeros.progress = 0.0;
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: bodyWithZeros })
        .expect('Content-Type', /json/)
        .expect(200)
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

    it('should return updated phase if the order is specified', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: _.assign({ order: 1 }, updateBody) })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            validatePhase(resJson, updateBody);
            resJson.order.should.be.eql(1);

            // Check the order of the other phase
            models.ProjectPhase.findOne({ where: { id: phaseId2 } })
              .then((phase2) => {
                phase2.order.should.be.eql(2);
                done();
              });
          }
        });
    });
  });
});
