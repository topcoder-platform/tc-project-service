/* eslint-disable no-unused-expressions */
/**
 * Tests for create.js
 */
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import _ from 'lodash';
import server from '../../app';
import testUtil from '../../tests/util';
import models from '../../models';
import busApi from '../../services/busApi';
import { RESOURCES, BUS_API_EVENT } from '../../constants';

const should = chai.should();

describe('CREATE milestone', () => {
  let projectId1;
  let projectId2;

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
            lastActivityAt: 1,
            lastActivityUserId: '1',
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
            lastActivityAt: 1,
            lastActivityUserId: '1',
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
                ]))
              .then(() => {
                // Create milestones
                models.Milestone.bulkCreate([
                  {
                    id: 11,
                    timelineId: 1,
                    name: 'milestone 1',
                    duration: 2,
                    startDate: '2018-05-03T00:00:00.000Z',
                    status: 'draft',
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
                  },
                  {
                    id: 12,
                    timelineId: 1,
                    name: 'milestone 2',
                    duration: 3,
                    startDate: '2018-05-04T00:00:00.000Z',
                    status: 'draft',
                    type: 'type2',
                    order: 2,
                    plannedText: 'plannedText 2',
                    activeText: 'activeText 2',
                    completedText: 'completedText 2',
                    blockedText: 'blockedText 2',
                    createdBy: 2,
                    updatedBy: 3,
                  },
                  {
                    id: 13,
                    timelineId: 1,
                    name: 'milestone 3',
                    duration: 4,
                    startDate: '2018-05-04T00:00:00.000Z',
                    status: 'draft',
                    type: 'type3',
                    order: 3,
                    plannedText: 'plannedText 3',
                    activeText: 'activeText 3',
                    completedText: 'completedText 3',
                    blockedText: 'blockedText 3',
                    createdBy: 3,
                    updatedBy: 4,
                  },
                ])
                  .then(() => done());
              });
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /timelines/{timelineId}/milestones', () => {
    const body = {
      name: 'milestone 4',
      description: 'description 4',
      duration: 4,
      startDate: '2018-05-05T00:00:00.000Z',
      endDate: '2018-05-07T00:00:00.000Z',
      completionDate: '2018-05-08T00:00:00.000Z',
      status: 'draft',
      type: 'type4',
      details: {
        detail1: {
          subDetail1C: 4,
        },
        detail2: [
          3,
          4,
          5,
        ],
      },
      order: 2,
      plannedText: 'plannedText 4',
      activeText: 'activeText 4',
      completedText: 'completedText 4',
      blockedText: 'blockedText 4',
      hidden: true,
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .post('/v5/timelines/1/milestones')
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member who is not in the project', (done) => {
      request(server)
        .post('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 400 if missing name', (done) => {
      const invalidBody = _.assign({}, body, {
        name: undefined,
      });

      request(server)
        .post('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if missing duration', (done) => {
      const invalidBody = _.assign({}, body, {
        duration: undefined,
      });

      request(server)
        .post('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if missing type', (done) => {
      const invalidBody = _.assign({}, body, {
        type: undefined,
      });

      request(server)
        .post('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if missing order', (done) => {
      const invalidBody = _.assign({}, body, {
        order: undefined,
      });

      request(server)
        .post('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if startDate is after endDate', (done) => {
      const invalidBody = _.assign({}, body, {
        startDate: '2018-05-29T00:00:00.000Z',
        endDate: '2018-05-28T00:00:00.000Z',
      });

      request(server)
        .post('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if startDate is after completionDate', (done) => {
      const invalidBody = _.assign({}, body, {
        startDate: '2018-05-29T00:00:00.000Z',
        completionDate: '2018-05-28T00:00:00.000Z',
      });

      request(server)
        .post('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if startDate is before the timeline startDate', (done) => {
      const invalidBody = _.assign({}, body, {
        startDate: '2018-05-01T00:00:00.000Z',
      });

      request(server)
        .post('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if invalid timelineId param', (done) => {
      request(server)
        .post('/v5/timelines/0/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 404 if timeline does not exist', (done) => {
      request(server)
        .post('/v5/timelines/1000/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 if timeline was deleted', (done) => {
      request(server)
        .post('/v5/timelines/3/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 201 for admin', (done) => {
      request(server)
        .post('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          should.exist(resJson.id);
          resJson.name.should.be.eql(body.name);
          resJson.description.should.be.eql(body.description);
          resJson.duration.should.be.eql(body.duration);
          resJson.startDate.should.be.eql(body.startDate);
          resJson.endDate.should.be.eql(body.endDate);
          resJson.completionDate.should.be.eql(body.completionDate);
          resJson.status.should.be.eql(body.status);
          resJson.type.should.be.eql(body.type);
          resJson.details.should.be.eql(body.details);
          resJson.order.should.be.eql(body.order);
          resJson.plannedText.should.be.eql(body.plannedText);
          resJson.activeText.should.be.eql(body.activeText);
          resJson.completedText.should.be.eql(body.completedText);
          resJson.blockedText.should.be.eql(body.blockedText);
          resJson.hidden.should.be.eql(body.hidden);

          resJson.createdBy.should.be.eql(40051333); // admin
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          // validate statusHistory
          should.exist(resJson.statusHistory);
          resJson.statusHistory.should.be.an('array');
          resJson.statusHistory.length.should.be.eql(0);

          // Verify 'order' of the other milestones
          models.Milestone.findAll({ where: { timelineId: 1 } })
            .then((milestones) => {
              _.each(milestones, (milestone) => {
                if (milestone.id === 11) {
                  milestone.order.should.be.eql(1);
                } else if (milestone.id === 12) {
                  milestone.order.should.be.eql(1 + 1);
                } else if (milestone.id === 13) {
                  milestone.order.should.be.eql(2 + 1);
                }
              });

              done();
            });
        });
    });

    it('should return 201 for connect manager', (done) => {
      request(server)
        .post('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          resJson.createdBy.should.be.eql(40051334); // manager
          resJson.updatedBy.should.be.eql(40051334); // manager
          done();
        });
    });

    it('should return 201 for connect admin', (done) => {
      request(server)
        .post('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          resJson.createdBy.should.be.eql(40051336); // connect admin
          resJson.updatedBy.should.be.eql(40051336); // connect admin
          done();
        });
    });

    it('should return 201 for copilot', (done) => {
      request(server)
        .post('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          resJson.createdBy.should.be.eql(40051332); // copilot
          resJson.updatedBy.should.be.eql(40051332); // copilot
          done();
        });
    });

    it('should return 201 for member', (done) => {
      request(server)
        .post('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body;
          resJson.createdBy.should.be.eql(40051331); // member
          resJson.updatedBy.should.be.eql(40051331); // member
          done();
        });
    });

    describe('Bus api', () => {
      let createEventSpy;
      const sandbox = sinon.sandbox.create();

      before((done) => {
        // Wait for 500ms in order to wait for createEvent calls from previous tests to complete
        testUtil.wait(done);
      });

      beforeEach(() => {
        createEventSpy = sandbox.spy(busApi, 'createEvent');
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('sends send correct BUS API messages milestone created', (done) => {
        request(server)
          .post('/v5/timelines/1/milestones')
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send(body)
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(2);

                // added a new milestone
                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_ADDED, sinon.match({
                  resource: RESOURCES.MILESTONE,
                  name: 'milestone 4',
                  description: 'description 4',
                  order: 2,
                })).should.be.true;

                done();
              });
            }
          });
      });
    });
  });
});
