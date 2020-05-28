/* eslint-disable no-unused-expressions */
/**
 * Tests for bulkUpdate
 */
import _ from 'lodash';
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import { RESOURCES, BUS_API_EVENT } from '../../constants';

const should = chai.should();

describe('BULK UPDATE Milestones', () => {
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
                    status: 'active',
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
                    actualStartDate: '2018-05-14T00:00:00.000Z',
                    completionDate: '2018-05-15T00:00:00.000Z',
                    status: 'reviewed',
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
                    status: 'active',
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
                    status: 'active',
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
                    status: 'active',
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
                    timelineId: 1,
                    name: 'Milestone 6',
                    duration: 3,
                    startDate: '2018-05-14T00:00:00.000Z',
                    status: 'active',
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

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('PATCH /timelines/{timelineId}/milestones', () => {
    const body = {
      name: 'Milestone 1',
      duration: 3,
      description: 'description-updated',
      status: 'draft',
      type: 'type1-updated',
      startDate: '2018-05-14T00:00:00.000Z',
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
      hidden: true,
    };
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch('/v5/timelines/1/milestones')
        .send([body])
        .expect(403, done);
    });

    it('should return 403 for member who is not in the project', (done) => {
      request(server)
        .patch('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send([body])
        .expect(403, done);
    });

    it('should return 403 for non-admin member updating the completionDate', (done) => {
      const newBody = _.cloneDeep(body);
      newBody.id = 2;
      newBody.completionDate = '2019-01-16T00:00:00.000Z';
      request(server)
        .patch('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send([newBody])
        .expect(403, done);
    });

    it('should return 403 for non-admin member updating the actualStartDate', (done) => {
      const newBody = _.cloneDeep(body);
      newBody.actualStartDate = '2018-05-15T00:00:00.000Z';
      newBody.id = 2;
      request(server)
        .patch('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send([newBody])
        .expect(403, done);
    });

    it('should return 404 for non-existed timeline', (done) => {
      request(server)
        .patch('/v5/timelines/1234/milestones')
        .send([body])
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted timeline', (done) => {
      request(server)
        .patch('/v5/timelines/3/milestones')
        .send([body])
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for non-existed Milestone', (done) => {
      const data = [Object.assign({}, body, { id: 111 })];
      request(server)
        .patch('/v5/timelines/1/milestones')
        .send(data)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted Milestone', (done) => {
      const data = [Object.assign({}, body, { id: 5 })];
      request(server)
        .patch('/v5/timelines/1/milestones')
        .send(data)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 400 for invalid timelineId param', (done) => {
      request(server)
        .patch('/v5/timelines/0/milestones')
        .send([body])
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(400, done);
    });

    it('should return 400 for invalid milestoneId param', (done) => {
      const data = [Object.assign({}, body, { id: 0 })];
      request(server)
        .patch('/v5/timelines/1/milestones')
        .send(data)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(400, done);
    });

    it('should return 200 for admin doing creation, update, deletion operation', (done) => {
      const data = [
        Object.assign({}, body, { id: 1, actualStartDate: '2018-05-15T00:00:00.000Z' }),
        Object.assign({}, body, { name: 'Milestone to create in bulk' }),
      ];
      request(server)
        .patch('/v5/timelines/1/milestones')
        .send(data)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const milestones = res.body;

            // check that milestone with id=1 is updated
            const updatedMilestone = _.find(milestones, { id: 1 });
            should.exist(updatedMilestone);
            updatedMilestone.actualStartDate.should.be.eql('2018-05-15T00:00:00.000Z');

            // check that a new milestone is created
            const createdMilestone = _.find(milestones, { name: 'Milestone to create in bulk' });
            should.exist(createdMilestone);
            _.omit(createdMilestone, [
              'id',
              'createdAt',
              'updatedAt',
              'statusHistory',
            ]).should.eql(_.assign({}, body, {
              name: 'Milestone to create in bulk',
              actualStartDate: null,
              completionDate: null,
              endDate: null,
              createdBy: 40051333,
              updatedBy: 40051333,
              timelineId: 1,
            }));

            // check that all other milestones are deleted
            milestones.length.should.be.eql(2);

            done();
          }
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

      it('sends send correct BUS API messages when milestone are bulk updated', (done) => {
        const data = [
          Object.assign({}, body, { id: 1, actualStartDate: '2018-05-15T00:00:00.000Z' }),
          Object.assign({}, body, { name: 'Milestone to create in bulk' }),
        ];
        request(server)
          .patch('/v5/timelines/1/milestones')
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send(data)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_UPDATED, sinon.match({
                  resource: RESOURCES.MILESTONE,
                  id: 1,
                })).should.be.true;

                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_ADDED, sinon.match({
                  resource: RESOURCES.MILESTONE,
                  name: 'Milestone to create in bulk',
                })).should.be.true;

                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_REMOVED, sinon.match({
                  resource: RESOURCES.MILESTONE,
                  id: 2,
                })).should.be.true;

                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_REMOVED, sinon.match({
                  resource: RESOURCES.MILESTONE,
                  id: 3,
                })).should.be.true;

                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_REMOVED, sinon.match({
                  resource: RESOURCES.MILESTONE,
                  id: 4,
                })).should.be.true;

                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_REMOVED, sinon.match({
                  resource: RESOURCES.MILESTONE,
                  id: 6,
                })).should.be.true;

                done();
              });
            }
          });
      });
    });
  });
});
