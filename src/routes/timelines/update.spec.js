/**
 * Tests for get.js
 */
import chai from 'chai';
import request from 'supertest';
import _ from 'lodash';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import { EVENT } from '../../constants';

const should = chai.should();


const milestones = [
  {
    id: 1,
    timelineId: 1,
    name: 'milestone 1',
    duration: 2,
    startDate: '2018-05-13T00:00:00.000Z',
    endDate: '2018-05-16T00:00:00.000Z',
    completionDate: '2018-05-05T00:00:00.000Z',
    status: 'open',
    type: 'type1',
    details: {
      detail1: {
        subDetail1A: 1,
        subDetail1B: 2,
      },
      detail2: [1, 2, 3],
    },
    order: 1,
    plannedText: 'plannedText 1',
    activeText: 'activeText 1',
    completedText: 'completedText 1',
    blockedText: 'blockedText 1',
    createdBy: 1,
    updatedBy: 2,
    createdAt: '2018-05-11T00:00:00.000Z',
    updatedAt: '2018-05-11T00:00:00.000Z',
  },
  {
    id: 2,
    timelineId: 1,
    name: 'milestone 2',
    duration: 3,
    startDate: '2018-05-14T00:00:00.000Z',
    status: 'open',
    type: 'type2',
    order: 2,
    plannedText: 'plannedText 2',
    activeText: 'activeText 2',
    completedText: 'completedText 2',
    blockedText: 'blockedText 2',
    createdBy: 2,
    updatedBy: 3,
    createdAt: '2018-05-11T00:00:00.000Z',
    updatedAt: '2018-05-11T00:00:00.000Z',
  },
];

describe('UPDATE timeline', () => {
  beforeEach((done) => {
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
          .then(() => {
            // Create member
            models.ProjectMember.bulkCreate([
              {
                userId: 40051332,
                projectId: 1,
                role: 'copilot',
                isPrimary: true,
                createdBy: 1,
                updatedBy: 1,
              },
              {
                userId: 40051331,
                projectId: 1,
                role: 'customer',
                isPrimary: true,
                createdBy: 1,
                updatedBy: 1,
              },
            ]).then(() =>
              // Create phase
              models.ProjectPhase.bulkCreate([
                {
                  projectId: 1,
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
                  projectId: 2,
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
              ]), { returning: true })
              .then(() =>
                // Create timelines
                models.Timeline.bulkCreate([
                  {
                    name: 'name 1',
                    description: 'description 1',
                    startDate: '2018-05-11T00:00:00.000Z',
                    endDate: '2018-05-20T00:00:00.000Z',
                    reference: 'project',
                    referenceId: 1,
                    createdBy: 1,
                    updatedBy: 1,
                  },
                  {
                    name: 'name 2',
                    description: 'description 2',
                    startDate: '2018-05-12T00:00:00.000Z',
                    endDate: '2018-05-13T00:00:00.000Z',
                    reference: 'phase',
                    referenceId: 1,
                    createdBy: 1,
                    updatedBy: 1,
                  },
                  {
                    name: 'name 3',
                    description: 'description 3',
                    startDate: '2018-05-13T00:00:00.000Z',
                    endDate: '2018-05-14T00:00:00.000Z',
                    reference: 'phase',
                    referenceId: 1,
                    createdBy: 1,
                    updatedBy: 1,
                    deletedAt: '2018-05-14T00:00:00.000Z',
                  },
                ]))
              .then(() => models.Milestone.bulkCreate(milestones))
              .then(() => done());
          });
      });
  });

  after(testUtil.clearDb);

  describe('PATCH /timelines/{timelineId}', () => {
    const body = {
      param: {
        name: 'new name 1',
        description: 'new description 1',
        startDate: '2018-06-01T00:00:00.000Z',
        endDate: '2018-06-02T00:00:00.000Z',
        reference: 'project',
        referenceId: 1,
      },
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch('/v4/timelines/1')
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member who is not in the project', (done) => {
      request(server)
        .patch('/v4/timelines/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member who is not in the project (timeline refers to a phase)', (done) => {
      request(server)
        .patch('/v4/timelines/2')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed timeline', (done) => {
      request(server)
        .patch('/v4/timelines/1234')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted timeline', (done) => {
      request(server)
        .patch('/v4/timelines/3')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 422 for invalid param', (done) => {
      request(server)
        .patch('/v4/timelines/0')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(422, done);
    });

    it('should return 404 for non-existed template', (done) => {
      request(server)
        .patch('/v4/timelines/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 404 for deleted template', (done) => {
      request(server)
        .patch('/v4/timelines/3')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 422 if missing name', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          name: undefined,
        }),
      };

      request(server)
        .patch('/v4/timelines/1')
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
        .patch('/v4/timelines/1')
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
        .patch('/v4/timelines/1')
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
        .patch('/v4/timelines/1')
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
        .patch('/v4/timelines/1')
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
        .patch('/v4/timelines/1')
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
        .patch('/v4/timelines/1')
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
        .patch('/v4/timelines/1')
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
        .patch('/v4/timelines/1')
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
        .patch('/v4/timelines/1')
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
        .patch('/v4/timelines/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .patch('/v4/timelines/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          should.exist(resJson.id);
          resJson.name.should.be.eql(body.param.name);
          resJson.description.should.be.eql(body.param.description);
          resJson.startDate.should.be.eql(body.param.startDate);
          resJson.endDate.should.be.eql(body.param.endDate);
          resJson.reference.should.be.eql(body.param.reference);
          resJson.referenceId.should.be.eql(body.param.referenceId);

          resJson.createdBy.should.be.eql(1);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedAt);
          should.not.exist(resJson.deletedBy);

          // eslint-disable-next-line no-unused-expressions
          server.services.pubsub.publish.calledWith(EVENT.ROUTING_KEY.TIMELINE_UPDATED).should.be.true;

          done();
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin with changed startDate', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v4/timelines/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({
          param: _.assign({}, body.param, {
            startDate: '2018-05-15T00:00:00.000Z',
            endDate: '2018-05-17T00:00:00.000Z', // no affect to milestones
          }),
        })
        .expect(200)
        .end(() => {
          setTimeout(() => {
            models.Milestone.findById(1)
              .then((milestone) => {
                milestone.startDate.should.be.eql(new Date('2018-05-15T00:00:00.000Z'));
                milestone.endDate.should.be.eql(new Date('2018-05-16T00:00:00.000Z'));
              })
              .then(() => models.Milestone.findById(2))
              .then((milestone) => {
                milestone.startDate.should.be.eql(new Date('2018-05-15T00:00:00.000Z'));
                should.not.exist(milestone.endDate);

                done();
              });
          }, 3000);
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin with changed endDate', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v4/timelines/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({
          param: _.assign({}, body.param, {
            startDate: '2018-05-12T00:00:00.000Z', // no affect to milestones
            endDate: '2018-05-15T00:00:00.000Z',
          }),
        })
        .expect(200)
        .end(() => {
          setTimeout(() => {
            models.Milestone.findById(1)
              .then((milestone) => {
                milestone.startDate.should.be.eql(new Date('2018-05-13T00:00:00.000Z'));
                milestone.endDate.should.be.eql(new Date('2018-05-15T00:00:00.000Z'));
              })
              .then(() => models.Milestone.findById(2))
              .then((milestone) => {
                milestone.startDate.should.be.eql(new Date('2018-05-14T00:00:00.000Z'));
                should.not.exist(milestone.endDate);

                done();
              });
          }, 3000);
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .patch('/v4/timelines/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .patch('/v4/timelines/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .patch('/v4/timelines/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .patch('/v4/timelines/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });

    it('should return 200 if changing reference and referenceId', (done) => {
      const newBody = {
        param: _.assign({}, body.param, {
          reference: 'phase',
          referenceId: 1,
        }),
      };

      request(server)
        .patch('/v4/timelines/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(newBody)
        .expect(200)
        .end(done);
    });
  });
});
