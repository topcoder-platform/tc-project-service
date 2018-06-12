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

describe('UPDATE Milestone', () => {
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
        ])
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
              ]))
              .then(() =>
                // Create timelines
                models.Timeline.bulkCreate([
                  {
                    name: 'name 1',
                    description: 'description 1',
                    startDate: '2018-05-02T00:00:00.000Z',
                    endDate: '2018-06-12T00:00:00.000Z',
                    reference: 'project',
                    referenceId: 1,
                    createdBy: 1,
                    updatedBy: 1,
                  },
                  {
                    name: 'name 2',
                    description: 'description 2',
                    startDate: '2018-05-12T00:00:00.000Z',
                    endDate: '2018-06-13T00:00:00.000Z',
                    reference: 'phase',
                    referenceId: 1,
                    createdBy: 1,
                    updatedBy: 1,
                  },
                  {
                    name: 'name 3',
                    description: 'description 3',
                    startDate: '2018-05-13T00:00:00.000Z',
                    endDate: '2018-06-14T00:00:00.000Z',
                    reference: 'phase',
                    referenceId: 1,
                    createdBy: 1,
                    updatedBy: 1,
                    deletedAt: '2018-05-14T00:00:00.000Z',
                  },
                ]).then(() => models.Milestone.bulkCreate([
                  {
                    id: 1,
                    timelineId: 1,
                    name: 'Milestone 1',
                    duration: 2,
                    startDate: '2018-05-13T00:00:00.000Z',
                    endDate: '2018-05-14T00:00:00.000Z',
                    completionDate: '2018-05-15T00:00:00.000Z',
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
                    name: 'Milestone 2',
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
                  {
                    id: 3,
                    timelineId: 1,
                    name: 'Milestone 3',
                    duration: 3,
                    startDate: '2018-05-14T00:00:00.000Z',
                    status: 'open',
                    type: 'type3',
                    order: 3,
                    plannedText: 'plannedText 3',
                    activeText: 'activeText 3',
                    completedText: 'completedText 3',
                    blockedText: 'blockedText 3',
                    createdBy: 2,
                    updatedBy: 3,
                    createdAt: '2018-05-11T00:00:00.000Z',
                    updatedAt: '2018-05-11T00:00:00.000Z',
                  },
                  {
                    id: 4,
                    timelineId: 1,
                    name: 'Milestone 4',
                    duration: 3,
                    startDate: '2018-05-14T00:00:00.000Z',
                    status: 'open',
                    type: 'type4',
                    order: 4,
                    plannedText: 'plannedText 4',
                    activeText: 'activeText 4',
                    completedText: 'completedText 4',
                    blockedText: 'blockedText 4',
                    createdBy: 2,
                    updatedBy: 3,
                    createdAt: '2018-05-11T00:00:00.000Z',
                    updatedAt: '2018-05-11T00:00:00.000Z',
                  },
                  {
                    id: 5,
                    timelineId: 1,
                    name: 'Milestone 5',
                    duration: 3,
                    startDate: '2018-05-14T00:00:00.000Z',
                    status: 'open',
                    type: 'type5',
                    order: 5,
                    plannedText: 'plannedText 5',
                    activeText: 'activeText 5',
                    completedText: 'completedText 5',
                    blockedText: 'blockedText 5',
                    createdBy: 2,
                    updatedBy: 3,
                    createdAt: '2018-05-11T00:00:00.000Z',
                    updatedAt: '2018-05-11T00:00:00.000Z',
                    deletedAt: '2018-05-11T00:00:00.000Z',
                  },
                  {
                    id: 6,
                    timelineId: 2, // Timeline 2
                    name: 'Milestone 6',
                    duration: 3,
                    startDate: '2018-05-14T00:00:00.000Z',
                    status: 'open',
                    type: 'type5',
                    order: 1,
                    plannedText: 'plannedText 6',
                    activeText: 'activeText 6',
                    completedText: 'completedText 6',
                    blockedText: 'blockedText 6',
                    createdBy: 2,
                    updatedBy: 3,
                    createdAt: '2018-05-11T00:00:00.000Z',
                    updatedAt: '2018-05-11T00:00:00.000Z',
                  },
                ])))
              .then(() => done());
          });
      });
  });

  after(testUtil.clearDb);

  describe('PATCH /timelines/{timelineId}/milestones/{milestoneId}', () => {
    const body = {
      param: {
        name: 'Milestone 1-updated',
        duration: 3,
        startDate: '2018-05-14T00:00:00.000Z',
        endDate: '2018-05-15T00:00:00.000Z',
        completionDate: '2018-05-16T00:00:00.000Z',
        description: 'description-updated',
        status: 'closed',
        type: 'type1-updated',
        details: {
          detail1: {
            subDetail1A: 0,
            subDetail1C: 3,
          },
          detail2: [4],
          detail3: 3,
        },
        order: 1,
        plannedText: 'plannedText 1-updated',
        activeText: 'activeText 1-updated',
        completedText: 'completedText 1-updated',
        blockedText: 'blockedText 1-updated',
      },
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member who is not in the project', (done) => {
      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 404 for non-existed timeline', (done) => {
      request(server)
        .patch('/v4/timelines/1234/milestones/1')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted timeline', (done) => {
      request(server)
        .patch('/v4/timelines/3/milestones/1')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for non-existed Milestone', (done) => {
      request(server)
        .patch('/v4/timelines/1/milestones/111')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted Milestone', (done) => {
      request(server)
        .patch('/v4/timelines/1/milestones/5')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 422 for invalid timelineId param', (done) => {
      request(server)
        .patch('/v4/timelines/0/milestones/1')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(422, done);
    });

    it('should return 422 for invalid milestoneId param', (done) => {
      request(server)
        .patch('/v4/timelines/1/milestones/0')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(422, done);
    });


    it('should return 422 if missing name', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          name: undefined,
        }),
      };

      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if missing duration', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          duration: undefined,
        }),
      };

      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if missing type', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          type: undefined,
        }),
      };

      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if missing order', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          order: undefined,
        }),
      };

      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if missing plannedText', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          plannedText: undefined,
        }),
      };

      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if missing activeText', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          activeText: undefined,
        }),
      };

      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if missing completedText', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          completedText: undefined,
        }),
      };

      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if missing blockedText', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          blockedText: undefined,
        }),
      };

      request(server)
        .patch('/v4/timelines/1/milestones/1')
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
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if startDate is after completionDate', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          startDate: '2018-05-29T00:00:00.000Z',
          completionDate: '2018-05-28T00:00:00.000Z',
        }),
      };

      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if startDate is before timeline startDate', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          startDate: '2018-05-01T00:00:00.000Z',
        }),
      };

      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if endDate is after timeline endDate', (done) => {
      const invalidBody = {
        param: _.assign({}, body.param, {
          endDate: '2018-07-01T00:00:00.000Z',
        }),
      };

      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .patch('/v4/timelines/1/milestones/1')
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
          resJson.duration.should.be.eql(body.param.duration);
          resJson.startDate.should.be.eql(body.param.startDate);
          resJson.endDate.should.be.eql(body.param.endDate);
          resJson.completionDate.should.be.eql(body.param.completionDate);
          resJson.status.should.be.eql(body.param.status);
          resJson.type.should.be.eql(body.param.type);
          resJson.details.should.be.eql({
            detail1: { subDetail1A: 0, subDetail1B: 2, subDetail1C: 3 },
            detail2: [4],
            detail3: 3,
          });
          resJson.order.should.be.eql(body.param.order);
          resJson.plannedText.should.be.eql(body.param.plannedText);
          resJson.activeText.should.be.eql(body.param.activeText);
          resJson.completedText.should.be.eql(body.param.completedText);
          resJson.blockedText.should.be.eql(body.param.blockedText);

          should.exist(resJson.createdBy);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          // eslint-disable-next-line no-unused-expressions
          server.services.pubsub.publish.calledWith(EVENT.ROUTING_KEY.MILESTONE_UPDATED).should.be.true;

          done();
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - order increases and replaces another milestone\'s order', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ param: _.assign({}, body.param, { order: 4 }) }) // 1 to 4
        .expect(200)
        .end(() => {
          // Milestone 1: order 4
          // Milestone 2: order 2 - 1 = 1
          // Milestone 3: order 3 - 1 = 2
          // Milestone 4: order 4 - 1 = 3
          setTimeout(() => {
            models.Milestone.findById(1)
              .then((milestone) => {
                milestone.order.should.be.eql(4);
              })
              .then(() => models.Milestone.findById(2))
              .then((milestone) => {
                milestone.order.should.be.eql(1);
              })
              .then(() => models.Milestone.findById(3))
              .then((milestone) => {
                milestone.order.should.be.eql(2);
              })
              .then(() => models.Milestone.findById(4))
              .then((milestone) => {
                milestone.order.should.be.eql(3);

                done();
              });
          }, 3000);
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - order increases and doesnot replace another milestone\'s order', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ param: _.assign({}, body.param, { order: 5 }) }) // 1 to 5
        .expect(200)
        .end(() => {
          // Milestone 1: order 5
          // Milestone 2: order 2
          // Milestone 3: order 3
          // Milestone 4: order 4
          setTimeout(() => {
            models.Milestone.findById(1)
              .then((milestone) => {
                milestone.order.should.be.eql(5);
              })
              .then(() => models.Milestone.findById(2))
              .then((milestone) => {
                milestone.order.should.be.eql(2);
              })
              .then(() => models.Milestone.findById(3))
              .then((milestone) => {
                milestone.order.should.be.eql(3);
              })
              .then(() => models.Milestone.findById(4))
              .then((milestone) => {
                milestone.order.should.be.eql(4);

                done();
              });
          }, 3000);
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - order decreases and replaces another milestone\'s order', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v4/timelines/1/milestones/4')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ param: _.assign({}, body.param, { order: 2 }) }) // 4 to 2
        .expect(200)
        .end(() => {
          // Milestone 1: order 1
          // Milestone 2: order 3
          // Milestone 3: order 4
          // Milestone 4: order 2
          setTimeout(() => {
            models.Milestone.findById(1)
              .then((milestone) => {
                milestone.order.should.be.eql(1);
              })
              .then(() => models.Milestone.findById(2))
              .then((milestone) => {
                milestone.order.should.be.eql(3);
              })
              .then(() => models.Milestone.findById(3))
              .then((milestone) => {
                milestone.order.should.be.eql(4);
              })
              .then(() => models.Milestone.findById(4))
              .then((milestone) => {
                milestone.order.should.be.eql(2);

                done();
              });
          }, 3000);
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - order decreases and doesnot replace another milestone\'s order', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v4/timelines/1/milestones/4')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ param: _.assign({}, body.param, { order: 0 }) }) // 4 to 0
        .expect(200)
        .end(() => {
          // Milestone 1: order 1
          // Milestone 2: order 2
          // Milestone 3: order 3
          // Milestone 4: order 0
          setTimeout(() => {
            models.Milestone.findById(1)
              .then((milestone) => {
                milestone.order.should.be.eql(1);
              })
              .then(() => models.Milestone.findById(2))
              .then((milestone) => {
                milestone.order.should.be.eql(2);
              })
              .then(() => models.Milestone.findById(3))
              .then((milestone) => {
                milestone.order.should.be.eql(3);
              })
              .then(() => models.Milestone.findById(4))
              .then((milestone) => {
                milestone.order.should.be.eql(0);

                done();
              });
          }, 3000);
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - changing order with only 1 item in list', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v4/timelines/2/milestones/6')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send({ param: _.assign({}, body.param, { order: 0 }) }) // 1 to 0
        .expect(200)
        .end(() => {
          // Milestone 6: order 0
          setTimeout(() => {
            models.Milestone.findById(6)
              .then((milestone) => {
                milestone.order.should.be.eql(0);

                done();
              });
          }, 3000);
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - changing order without changing other milestones\' orders', function (done) {
      this.timeout(10000);

      models.Milestone.bulkCreate([
        {
          id: 7,
          timelineId: 2, // Timeline 2
          name: 'Milestone 7',
          duration: 3,
          startDate: '2018-05-14T00:00:00.000Z',
          status: 'open',
          type: 'type7',
          order: 3,
          plannedText: 'plannedText 7',
          activeText: 'activeText 7',
          completedText: 'completedText 7',
          blockedText: 'blockedText 7',
          createdBy: 2,
          updatedBy: 3,
          createdAt: '2018-05-11T00:00:00.000Z',
          updatedAt: '2018-05-11T00:00:00.000Z',
        },
        {
          id: 8,
          timelineId: 2, // Timeline 2
          name: 'Milestone 8',
          duration: 3,
          startDate: '2018-05-14T00:00:00.000Z',
          status: 'open',
          type: 'type7',
          order: 4,
          plannedText: 'plannedText 8',
          activeText: 'activeText 8',
          completedText: 'completedText 8',
          blockedText: 'blockedText 8',
          createdBy: 2,
          updatedBy: 3,
          createdAt: '2018-05-11T00:00:00.000Z',
          updatedAt: '2018-05-11T00:00:00.000Z',
        },
      ])
        .then(() => {
          request(server)
            .patch('/v4/timelines/2/milestones/8')
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send({ param: _.assign({}, body.param, { order: 2 }) }) // 4 to 2
            .expect(200)
            .end(() => {
              // Milestone 6: order 1 => 1
              // Milestone 7: order 3 => 3
              // Milestone 8: order 4 => 2
              setTimeout(() => {
                models.Milestone.findById(6)
                  .then((milestone) => {
                    milestone.order.should.be.eql(1);
                  })
                  .then(() => models.Milestone.findById(7))
                  .then((milestone) => {
                    milestone.order.should.be.eql(3);
                  })
                  .then(() => models.Milestone.findById(8))
                  .then((milestone) => {
                    milestone.order.should.be.eql(2);

                    done();
                  });
              }, 3000);
            });
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - changing order withchanging other milestones\' orders', function (done) {
      this.timeout(10000);

      models.Milestone.bulkCreate([
        {
          id: 7,
          timelineId: 2, // Timeline 2
          name: 'Milestone 7',
          duration: 3,
          startDate: '2018-05-14T00:00:00.000Z',
          status: 'open',
          type: 'type7',
          order: 2,
          plannedText: 'plannedText 7',
          activeText: 'activeText 7',
          completedText: 'completedText 7',
          blockedText: 'blockedText 7',
          createdBy: 2,
          updatedBy: 3,
          createdAt: '2018-05-11T00:00:00.000Z',
          updatedAt: '2018-05-11T00:00:00.000Z',
        },
        {
          id: 8,
          timelineId: 2, // Timeline 2
          name: 'Milestone 8',
          duration: 3,
          startDate: '2018-05-14T00:00:00.000Z',
          status: 'open',
          type: 'type7',
          order: 4,
          plannedText: 'plannedText 8',
          activeText: 'activeText 8',
          completedText: 'completedText 8',
          blockedText: 'blockedText 8',
          createdBy: 2,
          updatedBy: 3,
          createdAt: '2018-05-11T00:00:00.000Z',
          updatedAt: '2018-05-11T00:00:00.000Z',
        },
      ])
        .then(() => {
          request(server)
            .patch('/v4/timelines/2/milestones/8')
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send({ param: _.assign({}, body.param, { order: 2 }) }) // 4 to 2
            .expect(200)
            .end(() => {
              // Milestone 6: order 1 => 1
              // Milestone 7: order 2 => 3
              // Milestone 8: order 4 => 2
              setTimeout(() => {
                models.Milestone.findById(6)
                  .then((milestone) => {
                    milestone.order.should.be.eql(1);
                  })
                  .then(() => models.Milestone.findById(7))
                  .then((milestone) => {
                    milestone.order.should.be.eql(3);
                  })
                  .then(() => models.Milestone.findById(8))
                  .then((milestone) => {
                    milestone.order.should.be.eql(2);

                    done();
                  });
              }, 3000);
            });
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .patch('/v4/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });
  });
});
