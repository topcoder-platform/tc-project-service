/* eslint-disable no-unused-expressions */
/**
 * Tests for status.pause.js
 */
import chai from 'chai';
import _ from 'lodash';
import request from 'supertest';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

chai.should();

describe('Status Pause Milestone', () => {
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
  describe('PATCH /timelines/{timelineId}/milestones/{milestoneId}/status/pause', () => {
    const body = {
      param: {
        comment: 'comment',
      },
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch('/v4/timelines/1/milestones/1/status/pause')
        .send(body)
        .expect(403, done);
    });


    it('should return 403 for member who is not in the project', (done) => {
      request(server)
          .patch('/v4/timelines/1/milestones/1/status/pause')
          .set({
            Authorization: `Bearer ${testUtil.jwts.member2}`,
          })
          .send(body)
          .expect(403, done);
    });

    it('should return 404 for non-existed timeline', (done) => {
      request(server)
          .patch('/v4/timelines/1234/milestones/1/status/pause')
          .send(body)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .expect(404, done);
    });

    it('should return 404 for deleted timeline', (done) => {
      request(server)
          .patch('/v4/timelines/3/milestones/1/status/pause')
          .send(body)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .expect(404, done);
    });

    it('should return 404 for non-existed Milestone', (done) => {
      request(server)
          .patch('/v4/timelines/1/milestones/111/status/pause')
          .send(body)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .expect(404, done);
    });

    it('should return 404 for deleted Milestone', (done) => {
      request(server)
          .patch('/v4/timelines/1/milestones/5/status/pause')
          .send(body)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .expect(404, done);
    });

    it('should return 422 for invalid timelineId param', (done) => {
      request(server)
          .patch('/v4/timelines/0/milestones/1/status/pause')
          .send(body)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .expect(422, done);
    });

    it('should return 422 for invalid milestoneId param', (done) => {
      request(server)
          .patch('/v4/timelines/1/milestones/0/status/pause')
          .send(body)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .expect(422, done);
    });

    it('should return 422 for missing comment', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.param.comment;
      request(server)
          .patch('/v4/timelines/1/milestones/1/status/pause')
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send(partialBody)
          .expect(422, done);
    });

    it('should return 200 and status should update to paused', (done) => {
      request(server)
            .patch('/v4/timelines/1/milestones/1/status/pause')
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(body)
            .expect(200)
            .end(() => {
              models.Milestone.findById(1)
                .then((milestone) => {
                  milestone.status.should.be.eql('paused');
                  done();
                });
            });
    });

    it('should have one status history created with multiple sequencial status paused messages', function fn(done) {
      this.timeout(10000);
      request(server)
              .patch('/v4/timelines/1/milestones/1/status/pause')
              .set({
                Authorization: `Bearer ${testUtil.jwts.admin}`,
              })
              .send(body)
              .expect(200)
              .end(() => {
                request(server)
                .patch('/v4/timelines/1/milestones/1/status/pause')
                .set({
                  Authorization: `Bearer ${testUtil.jwts.admin}`,
                })
                .send(body)
                .expect(422)
                .end(() => {
                  done();
                });
              });
    });
  });
});
