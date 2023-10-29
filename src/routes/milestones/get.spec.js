/**
 * Tests for get.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('GET milestone', () => {
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
            ])
              .then(() =>
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
              .then(() => {
                // Create milestones
                models.Milestone.bulkCreate([
                  {
                    id: 1,
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
                    id: 2,
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
                    id: 3,
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
                ])
                  .then(() => done());
              });
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /timelines/{timelineId}/milestones/{milestoneId}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones/1')
        .expect(403, done);
    });

    it('should return 403 for member who is not in the project', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed timeline', (done) => {
      request(server)
        .get('/v5/timelines/1234/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted timeline', (done) => {
      request(server)
        .get('/v5/timelines/3/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for non-existed milestone', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted milestone', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones/3')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 400 for invalid timelineId param', (done) => {
      request(server)
        .get('/v5/timelines/0/milestones/3')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(400, done);
    });

    it('should return 400 for invalid milestoneId param', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones/0')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(400, done);
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.id.should.be.eql(1);
          resJson.timelineId.should.be.eql(1);
          resJson.name.should.be.eql('milestone 1');
          resJson.duration.should.be.eql(2);
          resJson.startDate.should.be.eql('2018-05-03T00:00:00.000Z');
          resJson.status.should.be.eql('open');
          resJson.type.should.be.eql('type1');
          resJson.details.should.be.eql({
            detail1: {
              subDetail1A: 1,
              subDetail1B: 2,
            },
            detail2: [1, 2, 3],
          });
          resJson.order.should.be.eql(1);
          resJson.plannedText.should.be.eql('plannedText 1');
          resJson.activeText.should.be.eql('activeText 1');
          resJson.completedText.should.be.eql('completedText 1');
          resJson.blockedText.should.be.eql('blockedText 1');

          resJson.createdBy.should.be.eql(1);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(2);
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          // validate statusHistory
          should.exist(resJson.statusHistory);
          resJson.statusHistory.should.be.an('array');
          resJson.statusHistory.length.should.be.eql(1);
          resJson.statusHistory.forEach((statusHistory) => {
            statusHistory.reference.should.be.eql('milestone');
            statusHistory.referenceId.should.be.eql(resJson.id);
          });

          done();
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });
  });
});
