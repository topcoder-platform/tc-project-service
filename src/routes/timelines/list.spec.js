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

const should = chai.should();

const timelines = [
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
    referenceId: 2,
    createdBy: 1,
    updatedBy: 1,
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


describe('LIST timelines', () => {
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
              .then(() =>
                // Create timelines
                models.Timeline.bulkCreate(timelines, { returning: true })
                  .then(createdTimelines => (
                    // create milestones after timelines
                    models.Milestone.bulkCreate(milestones))
                    .then(createdMilestones => [createdTimelines, createdMilestones]),
                  ),
              ).then(([createdTimelines, createdMilestones]) =>
                // Index to ES
                Promise.all(_.map(createdTimelines, (createdTimeline) => {
                  const timelineJson = _.omit(createdTimeline.toJSON(), 'deletedAt', 'deletedBy');
                  timelineJson.projectId = createdTimeline.id !== 3 ? 1 : 2;
                  if (timelineJson.id === 1) {
                    timelineJson.milestones = _.map(
                      createdMilestones,
                      cm => _.omit(cm.toJSON(), 'deletedAt', 'deletedBy'),
                    );
                  }

                  return eClient.index({
                    index: ES_TIMELINE_INDEX,
                    type: ES_TIMELINE_TYPE,
                    id: timelineJson.id,
                    body: timelineJson,
                  });
                }))
                  .then(() => {
                    done();
                  }));
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /timelines', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v5/timelines')
        .expect(403, done);
    });

    it('should return 400 for invalid filter key', (done) => {
      request(server)
        .get('/v5/timelines?invalid=project')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(400)
        .end(done);
    });

    it('should return 400 for invalid reference filter', (done) => {
      request(server)
        .get('/v5/timelines?reference=invalid&referenceId=1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(400)
        .end(done);
    });

    it('should return 400 for invalid referenceId filter', (done) => {
      request(server)
        .get('/v5/timelines?reference=invalid&referenceId=0')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(400)
        .end(done);
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v5/timelines?reference=project&referenceId=1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const timeline = timelines[0];

          let resJson = res.body;
          resJson.should.have.length(1);
          resJson = _.sortBy(resJson, o => o.id);
          resJson[0].id.should.be.eql(1);
          resJson[0].name.should.be.eql(timeline.name);
          resJson[0].description.should.be.eql(timeline.description);
          resJson[0].startDate.should.be.eql(timeline.startDate);
          resJson[0].endDate.should.be.eql(timeline.endDate);
          resJson[0].reference.should.be.eql(timeline.reference);
          resJson[0].referenceId.should.be.eql(timeline.referenceId);

          resJson[0].createdBy.should.be.eql(timeline.createdBy);
          should.exist(resJson[0].createdAt);
          resJson[0].updatedBy.should.be.eql(timeline.updatedBy);
          should.exist(resJson[0].updatedAt);
          should.not.exist(resJson[0].deletedBy);
          should.not.exist(resJson[0].deletedAt);

          // Milestones
          resJson[0].milestones.should.have.length(2);
          resJson[0].milestones.forEach((milestone) => {
            // validate statusHistory
            should.exist(milestone.statusHistory);
            milestone.statusHistory.should.be.an('array');
            milestone.statusHistory.length.should.be.eql(1);
            milestone.statusHistory.forEach((statusHistory) => {
              statusHistory.reference.should.be.eql('milestone');
              statusHistory.referenceId.should.be.eql(milestone.id);
            });
          });

          done();
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .get('/v5/timelines?reference=project&referenceId=1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(1);

          done();
        });
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get('/v5/timelines?reference=project&referenceId=1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(1);

          done();
        });
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get('/v5/timelines?reference=project&referenceId=1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(1);

          done();
        });
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get('/v5/timelines?reference=project&referenceId=1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(1);

          done();
        });
    });

    it('should return 403 for member with not accessible project', (done) => {
      request(server)
        .get('/v5/timelines?reference=project&referenceId=1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect(403, done);
    });

    it('should return 200 with reference and referenceId filter', (done) => {
      request(server)
        .get('/v5/timelines?reference=project&referenceId=1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.should.have.length(1);

          done();
        });
    });
  });
});
