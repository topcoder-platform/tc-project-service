/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import request from 'supertest';
import server from '../../app';
import models from '../../models';
import testUtil from '../../tests/util';

const body = {
  name: 'test phase product',
  type: 'product1',
  estimatedPrice: 20.0,
  actualPrice: 1.23456,
  details: {
    message: 'This can be any json',
  },
  createdBy: 1,
  updatedBy: 1,
};

describe('Phase Products', () => {
  let projectId;
  let phaseId;
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
            }).then(() => {
              models.ProjectPhase.create({
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
                projectId,
              }).then((phase) => {
                phaseId = phase.id;
                _.assign(body, { phaseId, projectId });

                models.PhaseProduct.create(body).then(() => done());
              });
            });
          });
        });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/{id}/phases/{phaseId}/products', () => {
    it('should return 403 when user have no permission', (done) => {
      request(server)
        .get(`/v4/projects/${projectId}/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 404 when no project with specific projectId', (done) => {
      request(server)
        .get(`/v4/projects/999/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no phase with specific phaseId', (done) => {
      request(server)
        .get(`/v4/projects/${projectId}/phases/99999/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 1 phase when user have project permission', (done) => {
      request(server)
        .get(`/v4/projects/${projectId}/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            resJson.should.have.lengthOf(1);
            done();
          }
        });
    });
  });
});
