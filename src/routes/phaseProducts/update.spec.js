/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';
import server from '../../app';
import models from '../../models';
import testUtil from '../../tests/util';

const should = chai.should();

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

const updateBody = {
  name: 'test phase product xxx',
  type: 'product2',
  estimatedPrice: 123456.789,
  actualPrice: 9.8765432,
  details: {
    message: 'This is another json',
  },
};

describe('Phase Products', () => {
  let projectId;
  let phaseId;
  let productId;
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

                models.PhaseProduct.create(body).then((product) => {
                  productId = product.id;
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

  describe('PATCH /projects/{id}/phases/{phaseId}/products/{productId}', () => {
    it('should return 403 when user have no permission', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 404 when no project with specific projectId', (done) => {
      request(server)
        .patch(`/v4/projects/999/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no phase with specific phaseId', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/99999/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no product with specific productId', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}/products/99999`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 422 when parameters are invalid', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}/products/99999`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({
          param: {
            estimatedPrice: -15,
          },
        })
        .expect('Content-Type', /json/)
        .expect(422, done);
    });


    it('should return updated product when user have permission and parameters are valid', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/phases/${phaseId}/products/${productId}`)
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
            should.exist(resJson);
            resJson.name.should.be.eql(updateBody.name);
            resJson.type.should.be.eql(updateBody.type);
            resJson.estimatedPrice.should.be.eql(updateBody.estimatedPrice);
            resJson.actualPrice.should.be.eql(updateBody.actualPrice);
            resJson.details.should.be.eql(updateBody.details);
            done();
          }
        });
    });
  });
});
