/**
 * Tests for list.js
 */
import chai from 'chai';
import request from 'supertest';
import config from 'config';
import _ from 'lodash';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import util from '../../util';

const ES_TIMELINE_INDEX = config.get('elasticsearchConfig.timelineIndexName');
const ES_TIMELINE_TYPE = config.get('elasticsearchConfig.timelineDocType');
const eClient = util.getElasticSearchClient();

// eslint-disable-next-line no-unused-vars
const should = chai.should();

const timelines = [
  {
    id: 1,
    name: 'name 1',
    description: 'description 1',
    startDate: '2018-05-11T00:00:00.000Z',
    endDate: '2018-05-12T00:00:00.000Z',
    reference: 'project',
    referenceId: 1,
    createdBy: 1,
    updatedBy: 1,
    createdAt: '2018-05-11T00:00:00.000Z',
    updatedAt: '2018-05-11T00:00:00.000Z',
  },
];
const milestones = [
  {
    id: 1,
    timelineId: 1,
    name: 'milestone 1',
    duration: 2,
    startDate: '2018-05-03T00:00:00.000Z',
    endDate: '2018-05-04T00:00:00.000Z',
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
    hidden: false,
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
    startDate: '2018-05-04T00:00:00.000Z',
    status: 'open',
    type: 'type2',
    order: 2,
    hidden: false,
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

describe('LIST milestones', () => {
  before(function beforeHook(done) {
    this.timeout(10000);
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
                },
              ]))
              // Create timelines and milestones
              .then(() => models.Timeline.bulkCreate(timelines))
              .then(() => models.Milestone.bulkCreate(milestones))
              .then((createdMilestones) => {
                // Index to ES
                timelines[0].milestones = _.map(createdMilestones, cm => _.omit(cm.toJSON(), 'deletedAt', 'deletedBy'));
                timelines[0].projectId = 1;
                return eClient.index({
                  index: ES_TIMELINE_INDEX,
                  type: ES_TIMELINE_TYPE,
                  id: timelines[0].id,
                  body: timelines[0],
                });
              })
              .then(() => {
                done();
              });
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /timelines/{timelineId}/milestones', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v5/timelines')
        .expect(403, done);
    });

    it('should return 403 for member with no accessible project', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect(403, done);
    });

    it('should return 404 for not-existed timeline', (done) => {
      request(server)
        .get('/v5/timelines/11/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(404, done);
    });

    it('should return 400 for invalid sort column', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones?sort=id%20asc')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(400, done);
    });

    it('should return 400 for invalid sort order', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones?sort=order%20invalid')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(400, done);
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(2);

          resJson.forEach((milestone, index) => {
            milestone.statusHistory.should.be.an('array');
            milestone.statusHistory.length.should.be.eql(1);
            milestone.statusHistory.forEach((statusHistory) => {
              statusHistory.reference.should.be.eql('milestone');
              statusHistory.referenceId.should.be.eql(milestone.id);
            });

            const m = _.omitBy(_.omit(milestone, ['statusHistory']), _.isNil);

            m.should.be.eql(milestones[index]);
          });

          done();
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(2);

          done();
        });
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(2);

          done();
        });
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(2);

          done();
        });
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(2);

          done();
        });
    });

    it('should return 200 with sort by order desc', (done) => {
      request(server)
        .get('/v5/timelines/1/milestones?sort=order%20desc')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(2);

          const m1 = _.omitBy(_.omit(resJson[0], ['statusHistory']), _.isNil);
          const m2 = _.omitBy(_.omit(resJson[1], ['statusHistory']), _.isNil);
          m1.should.be.eql(milestones[1]);
          m2.should.be.eql(milestones[0]);

          done();
        });
    });
  });
});
