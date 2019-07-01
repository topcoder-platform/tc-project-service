/**
 * Tests for update.js
 */
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

describe('UPDATE Work Item', () => {
  let projectId;
  let workStreamId;
  let workId;
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
          models.WorkManagementPermissions.create({
            policy: 'workItem.edit',
            allowRule: {
              projectRoles: ['customer', 'copilot'],
              topcoderRoles: ['Connect Manager', 'Connect Admin', 'administrator'],
            },
            denyRule: { projectRoles: ['copilot'] },
            projectTemplateId: template.id,
            details: {},
            createdBy: 1,
            updatedBy: 1,
            lastActivityAt: 1,
            lastActivityUserId: '1',
          })
          .then(() => {
            // Create projects
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
                workStreamId = entity.id;
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
                  workId = phase.id;
                  models.PhaseWorkStream.create({
                    phaseId: workId,
                    workStreamId,
                  })
                  .then(() => {
                    _.assign(body, { phaseId: workId, projectId });
                    models.PhaseProduct.create(body).then((product) => {
                      productId = product.id;
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
              });
            });
          });
        });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('PATCH/projects/{projectId}/workstreams/{workStreamId}/works/{workId}/workitems/{productId}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/workstreams/${workStreamId}/works/${workId}/workitems/${productId}`)
        .send({ param: updateBody })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/workstreams/${workStreamId}/works/${workId}/workitems/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: updateBody })
        .expect(403, done);
    });

    it('should return 404 when no work stream with specific workStreamId', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/workstreams/999/works/${workId}/workitems/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when no work with specific workId', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/workstreams/${workStreamId}/works/999/workitems/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({ param: updateBody })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 422 when parameters are invalid', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/workstreams/${workStreamId}/works/999/workitems/99999`)
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

    it('should return 200 for member', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/workstreams/${workStreamId}/works/${workId}/workitems/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send({ param: updateBody })
        .expect(200, done);
    });

    it('should return updated product when user have permission and parameters are valid', (done) => {
      request(server)
        .patch(`/v4/projects/${projectId}/workstreams/${workStreamId}/works/${workId}/workitems/${productId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
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
