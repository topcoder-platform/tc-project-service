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

describe('Phase Products', () => {
  let projectId;
  let phaseId;
  let productId;
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
      .then(() => testUtil.clearES())
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
          lastActivityAt: 1,
          lastActivityUserId: '1',
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

  describe('GET /projects/{id}/phases/{phaseId}/products/{productId}', () => {
    it('should return 403 when user have no permission (non team member)', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 404 when no project with specific projectId', (done) => {
      request(server)
        .get(`/v5/projects/999/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no phase with specific phaseId', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/phases/99999/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no product with specific productId', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/phases/${phaseId}/products/99999`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 1 phase when user have project permission (customer)', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.name.should.be.eql(body.name);
            resJson.type.should.be.eql(body.type);
            resJson.estimatedPrice.should.be.eql(body.estimatedPrice);
            resJson.actualPrice.should.be.eql(body.actualPrice);
            resJson.details.should.be.eql(body.details);
            done();
          }
        });
    });

    it('should return 1 phase when user have project permission (copilot)', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/phases/${phaseId}/products/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.name.should.be.eql(body.name);
            resJson.type.should.be.eql(body.type);
            resJson.estimatedPrice.should.be.eql(body.estimatedPrice);
            resJson.actualPrice.should.be.eql(body.actualPrice);
            resJson.details.should.be.eql(body.details);
            done();
          }
        });
    });
  });
});
