/**
 * Tests for create.js
 */
import chai from 'chai';
import request from 'supertest';
import _ from 'lodash';
import server from '../../app';
import testUtil from '../../tests/util';
import models from '../../models';
import { EVENT } from '../../constants';

const should = chai.should();

describe('CREATE timeline', () => {
  let projectId1;
  let projectId2;

  before((done) => {
    testUtil.clearDb()
      .then(() => {
        models.Project.bulkCreate([
          {
            type: 'generic',
            billingAccountId: 1,
            name: 'test1',
            description: 'test project1',
            status: 'draft',
            details: {},
            createdBy: 1,
            updatedBy: 1,
          },
          {
            type: 'generic',
            billingAccountId: 2,
            name: 'test2',
            description: 'test project2',
            status: 'draft',
            details: {},
            createdBy: 2,
            updatedBy: 2,
            deletedAt: '2018-05-15T00:00:00Z',
          },
        ], { returning: true })
          .then((projects) => {
            projectId1 = projects[0].id;
            projectId2 = projects[1].id;

            // Create member
            models.ProjectMember.bulkCreate([
              {
                userId: 40051332,
                projectId: projectId1,
                role: 'copilot',
                isPrimary: true,
                createdBy: 1,
                updatedBy: 1,
              },
              {
                userId: 40051331,
                projectId: projectId1,
                role: 'customer',
                isPrimary: true,
                createdBy: 1,
                updatedBy: 1,
              },
            ]).then(() =>
              // Create phase
              models.ProjectPhase.bulkCreate([
                {
                  projectId: projectId1,
                  name: 'test project phase 1',
                  status: 'active',
                  startDate: '2018-05-15T00:00:00Z',
                  endDate: '2018-05-15T12:00:00Z',
                  budget: 20.0,
                  progress: 1.23456,
                  details: {
                    message: 'This can be any json 2',
                  },
                  createdBy: 1,
                  updatedBy: 1,
                },
                {
                  projectId: projectId2,
                  name: 'test project phase 2',
                  status: 'active',
                  startDate: '2018-05-16T00:00:00Z',
                  endDate: '2018-05-16T12:00:00Z',
                  budget: 21.0,
                  progress: 1.234567,
                  details: {
                    message: 'This can be any json 2',
                  },
                  createdBy: 2,
                  updatedBy: 2,
                  deletedAt: '2018-05-15T00:00:00Z',
                },
              ]))
              .then(() => {
                done();
              });
          });
      });
  });

  after(testUtil.clearDb);

  describe('POST /timelines', () => {
    const body = {
      param: {
        name: 'new name',
        description: 'new description',
        startDate: '2018-05-29T00:00:00.000Z',
        endDate: '2018-05-30T00:00:00.000Z',
        reference: 'project',
        referenceId: 1,
      },
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .post('/v4/timelines')
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member who is not in the project', (done) => {
      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member who is not in the project (timeline refers to a phase)', (done) => {
      const bodyWithPhase = {
        param: _.assign({}, body.param, {
          reference: 'phase',
          referenceId: 1,
        }),
      };

      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send(bodyWithPhase)
        .expect(403, done);
    });

    it('should return 422 if missing name', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          name: undefined,
        }),
      };

      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if missing startDate', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          startDate: undefined,
        }),
      };

      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if startDate is after endDate', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          startDate: '2018-05-29T00:00:00.000Z',
          endDate: '2018-05-28T00:00:00.000Z',
        }),
      };

      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if missing reference', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          reference: undefined,
        }),
      };

      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if missing referenceId', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          referenceId: undefined,
        }),
      };

      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if invalid reference', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          reference: 'invalid',
        }),
      };

      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if invalid referenceId', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          referenceId: 0,
        }),
      };

      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if project does not exist', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          referenceId: 1110,
        }),
      };

      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if project was deleted', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          referenceId: 2,
        }),
      };

      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if phase does not exist', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          reference: 'phase',
          referenceId: 2222,
        }),
      };

      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if phase was deleted', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          reference: 'phase',
          referenceId: 2,
        }),
      };

      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 201 for admin', (done) => {
      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.result.content;
          should.exist(resJson.id);
          resJson.name.should.be.eql(body.param.name);
          resJson.description.should.be.eql(body.param.description);
          resJson.startDate.should.be.eql(body.param.startDate);
          resJson.endDate.should.be.eql(body.param.endDate);
          resJson.reference.should.be.eql(body.param.reference);
          resJson.referenceId.should.be.eql(body.param.referenceId);

          resJson.createdBy.should.be.eql(40051333); // admin
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          // eslint-disable-next-line no-unused-expressions
          server.services.pubsub.publish.calledWith(EVENT.ROUTING_KEY.TIMELINE_ADDED).should.be.true;

          done();
        });
    });

    it('should return 201 for connect manager', (done) => {
      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.createdBy.should.be.eql(40051334); // manager
          resJson.updatedBy.should.be.eql(40051334); // manager
          done();
        });
    });

    it('should return 201 for connect admin', (done) => {
      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.createdBy.should.be.eql(40051336); // connect admin
          resJson.updatedBy.should.be.eql(40051336); // connect admin
          done();
        });
    });

    it('should return 201 for copilot', (done) => {
      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.createdBy.should.be.eql(40051332); // copilot
          resJson.updatedBy.should.be.eql(40051332); // copilot
          done();
        });
    });

    it('should return 201 for member', (done) => {
      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.createdBy.should.be.eql(40051331); // member
          resJson.updatedBy.should.be.eql(40051331); // member
          done();
        });
    });

    it('should return 201 for member (timeline refers to a phase)', (done) => {
      const bodyWithPhase = _.merge({}, body, {
        param: {
          reference: 'phase',
          referenceId: 1,
        },
      });
      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(bodyWithPhase)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.createdBy.should.be.eql(40051331); // member
          resJson.updatedBy.should.be.eql(40051331); // member
          done();
        });
    });
  });
});
