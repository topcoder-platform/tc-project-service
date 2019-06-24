/* eslint-disable no-unused-expressions */
/**
 * Tests for delete.js
 */
import request from 'supertest';
import sinon from 'sinon';
import chai from 'chai';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import { EVENT, RESOURCES, BUS_API_EVENT } from '../../constants';
import busApi from '../../services/busApi';

const should = chai.should(); // eslint-disable-line no-unused-vars

const expectAfterDelete = (timelineId, id, err, next) => {
  if (err) throw err;
  setTimeout(() =>
  models.Milestone.findOne({
    where: {
      timelineId,
      id,
    },
    paranoid: false,
  })
    .then((res) => {
      if (!res) {
        throw new Error('Should found the entity');
      } else {
        chai.assert.isNotNull(res.deletedAt);
        chai.assert.isNotNull(res.deletedBy);
      }
      next();
    }), 500);
};

describe('DELETE milestone', () => {
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
                    startDate: '2018-05-11T00:00:00.000Z',
                    endDate: '2018-05-12T00:00:00.000Z',
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
              .then(() =>
                // Create milestones
                models.Milestone.bulkCreate([
                  {
                    timelineId: 1,
                    name: 'milestone 1',
                    duration: 2,
                    startDate: '2018-05-03T00:00:00.000Z',
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
                  },
                  {
                    timelineId: 1,
                    name: 'milestone 2',
                    duration: 3,
                    startDate: '2018-05-04T00:00:00.000Z',
                    status: 'open',
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
                    timelineId: 1,
                    name: 'milestone 3',
                    duration: 4,
                    startDate: '2018-05-04T00:00:00.000Z',
                    status: 'open',
                    type: 'type3',
                    order: 3,
                    plannedText: 'plannedText 3',
                    activeText: 'activeText 3',
                    completedText: 'completedText 3',
                    blockedText: 'blockedText 3',
                    createdBy: 3,
                    updatedBy: 4,
                    deletedBy: 1,
                    deletedAt: '2018-05-04T00:00:00.000Z',
                  },
                ]))
              .then(() => done());
          });
      });
  });


  after((done) => {
    testUtil.clearDb(done);
  });

  describe('DELETE /timelines/{timelineId}/milestones/{milestoneId}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .delete('/v5/timelines/1/milestones/1')
        .expect(403, done);
    });

    it('should return 403 for member who is not in the project', (done) => {
      request(server)
        .delete('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect(403, done);
    });

    it('should return 403 for member who is not in the project (timeline refers to a phase)', (done) => {
      request(server)
        .delete('/v5/timelines/2/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed timeline', (done) => {
      request(server)
        .delete('/v5/timelines/1234/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted timeline', (done) => {
      request(server)
        .delete('/v5/timelines/3/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for non-existed milestone', (done) => {
      request(server)
        .delete('/v5/timelines/1/milestones/100')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted milestone', (done) => {
      request(server)
        .delete('/v5/timelines/1/milestones/3')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 400 for invalid timelineId param', (done) => {
      request(server)
        .delete('/v5/timelines/0/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(400, done);
    });

    it('should return 400 for invalid milestoneId param', (done) => {
      request(server)
        .delete('/v5/timelines/1/milestones/0')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(400, done);
    });

    it('should return 204, for admin, if timeline was successfully removed', (done) => {
      request(server)
        .delete('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(1, 1, err, () => {
          // eslint-disable-next-line no-unused-expressions
          server.services.pubsub.publish.calledWith(EVENT.ROUTING_KEY.MILESTONE_REMOVED).should.be.true;
          done();
        }));
    });

    it('should return 204, for connect admin, if timeline was successfully removed', (done) => {
      request(server)
        .delete('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(1, 1, err, done));
    });

    it('should return 204, for connect manager, if timeline was successfully removed', (done) => {
      request(server)
        .delete('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(1, 1, err, done));
    });

    it('should return 204, for copilot, if timeline was successfully removed', (done) => {
      request(server)
        .delete('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(1, 1, err, done));
    });

    it('should return 204, for member, if timeline was successfully removed', (done) => {
      request(server)
        .delete('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(1, 1, err, done));
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

      it('should send message BUS_API_EVENT.MILESTONE_REMOVED when milestone removed', (done) => {
        request(server)
          .delete('/v5/timelines/1/milestones/1')
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .expect(204)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.calledOnce.should.be.true;
                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_REMOVED,
                  sinon.match({ resource: RESOURCES.MILESTONE })).should.be.true;
                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_REMOVED,
                  sinon.match({ id: 1 })).should.be.true;
                done();
              });
            }
          });
      });
    });
  });
});
