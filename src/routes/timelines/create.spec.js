/**
 * Tests for create.js
 */
import chai from 'chai';
import moment from 'moment';
import request from 'supertest';
import _ from 'lodash';
import server from '../../app';
import testUtil from '../../tests/util';
import models from '../../models';
import { EVENT, MILESTONE_STATUS } from '../../constants';

const should = chai.should();

const testProjects = [
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
];

const productTemplates = [
  {
    name: 'name 1',
    productKey: 'productKey 1',
    category: 'generic',
    icon: 'http://example.com/icon1.ico',
    brief: 'brief 1',
    details: 'details 1',
    aliases: ['name-1'],
    template: { },
    createdBy: 1,
    updatedBy: 2,
  },
];
const milestoneTemplates = [
  {
    id: 1,
    name: 'milestoneTemplate 1',
    description: 'description 1',
    duration: 3,
    type: 'type1',
    order: 1,
    plannedText: 'text to be shown in planned stage',
    blockedText: 'text to be shown in blocked stage',
    activeText: 'text to be shown in active stage',
    completedText: 'text to be shown in completed stage',
    productTemplateId: 1,
    createdBy: 1,
    updatedBy: 2,
    hidden: false,
  },
  {
    id: 2,
    name: 'milestoneTemplate 2',
    description: 'description 2',
    duration: 4,
    type: 'type2',
    order: 2,
    plannedText: 'text to be shown in planned stage - 2',
    blockedText: 'text to be shown in blocked stage - 2',
    activeText: 'text to be shown in active stage - 2',
    completedText: 'text to be shown in completed stage - 2',
    productTemplateId: 1,
    createdBy: 2,
    updatedBy: 3,
    hidden: false,
  },
  {
    id: 3,
    name: 'milestoneTemplate 3',
    description: 'description 3',
    duration: 5,
    type: 'type3',
    order: 3,
    plannedText: 'text to be shown in planned stage - 3',
    blockedText: 'text to be shown in blocked stage - 3',
    activeText: 'text to be shown in active stage - 3',
    completedText: 'text to be shown in completed stage - 3',
    productTemplateId: 1,
    createdBy: 2,
    updatedBy: 3,
    hidden: false,
    deletedAt: new Date(),
  },
];

describe('CREATE timeline', () => {
  let projectId1;
  let projectId2;

  before((done) => {
    testUtil.clearDb()
      .then(() => {
        models.Project.bulkCreate(testProjects, { returning: true })
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
              ]));
          });
      })
      .then(() => models.ProductTemplate.bulkCreate(productTemplates))
      .then(() => models.ProductMilestoneTemplate.bulkCreate(milestoneTemplates))
      .then(() => {
        done();
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

    it('should return 201 for admin (with milestones)', (done) => {
      const withMilestones = _.cloneDeep(body);
      withMilestones.param.templateId = 1;
      request(server)
        .post('/v4/timelines')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(withMilestones)
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

          const milestones = resJson.milestones;
          milestones.forEach((milestone, mIdx) => {
            should.exist(milestone.id);
            let expMilestoneTemplate;
            if (mIdx === 0) {
              expMilestoneTemplate = _.find(milestoneTemplates, mt => mt.id === 1);
            } else if (mIdx === 1) {
              expMilestoneTemplate = _.find(milestoneTemplates, mt => mt.id === 2);
            }
            milestone.timelineId.should.be.eql(resJson.id);
            milestone.name.should.be.eql(expMilestoneTemplate.name);
            milestone.description.should.be.eql(expMilestoneTemplate.description);
            milestone.duration.should.be.eql(expMilestoneTemplate.duration);
            // expected number of days, for starting the milestone, from the timeline start
            let expDaysFromTimelineStart = 0;
            _.each(milestoneTemplates, (mt, idx) => {
              expDaysFromTimelineStart += (idx < mIdx ? mt.duration : 0);
            });
            // calculates expected start date of the milestone
            const expMilestoneStartDate = moment.utc(resJson.startDate).add(expDaysFromTimelineStart, 'days');
            // milestone created should have the expected start date
            expMilestoneStartDate.diff(moment.utc(milestone.startDate), 'days').should.be.eql(0);
            // calculates expected end date of the milestone
            const expMilestoneEndDate = moment.utc(milestone.startDate).add(expMilestoneTemplate.duration - 1, 'days');
            // milestone created should have the expected end date
            expMilestoneEndDate.diff(moment.utc(milestone.endDate), 'days').should.be.eql(0);
            // completionDate should not be set yet
            should.not.exist(milestone.completionDate);
            // status should be reviewed for new milestones
            milestone.status.should.be.eql(MILESTONE_STATUS.REVIEWED);
            milestone.type.should.be.eql(expMilestoneTemplate.type);
            milestone.details.should.be.eql({});
            milestone.order.should.be.eql(expMilestoneTemplate.order);
            milestone.plannedText.should.be.eql(expMilestoneTemplate.plannedText);
            milestone.activeText.should.be.eql(expMilestoneTemplate.activeText);
            milestone.completedText.should.be.eql(expMilestoneTemplate.completedText);
            milestone.blockedText.should.be.eql(expMilestoneTemplate.blockedText);
            milestone.hidden.should.be.eql(expMilestoneTemplate.hidden);

            milestone.createdBy.should.be.eql(40051333); // admin
            should.exist(milestone.createdAt);
            milestone.updatedBy.should.be.eql(40051333); // admin
            should.exist(milestone.updatedAt);
            should.not.exist(milestone.deletedBy);
            should.not.exist(milestone.deletedAt);
          });

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
