/* eslint-disable no-unused-expressions */
/**
 * Tests for get.js
 */
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import moment from 'moment';
import _ from 'lodash';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import busApi from '../../services/busApi';
import { RESOURCES, MILESTONE_STATUS, BUS_API_EVENT, CONNECT_NOTIFICATION_EVENT } from '../../constants';

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
                    timelineId: 2, // Timeline 2
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

  describe('PATCH /timelines/{timelineId}/milestones/{milestoneId}', () => {
    const body = {
      name: 'Milestone 1-updated',
      duration: 3,
      description: 'description-updated',
      status: 'draft',
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
      hidden: true,
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member who is not in the project', (done) => {
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for non-admin member updating the completionDate', (done) => {
      const newBody = _.cloneDeep(body);
      newBody.completionDate = '2019-01-16T00:00:00.000Z';
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(newBody)
        .expect(403, done);
    });

    it('should return 403 for non-admin member updating the actualStartDate', (done) => {
      const newBody = _.cloneDeep(body);
      newBody.actualStartDate = '2018-05-15T00:00:00.000Z';
      request(server)
        .patch('/v5/timelines/1/milestones/2')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(newBody)
        .expect(403, done);
    });

    it('should return 200 for non-admin member setting the completionDate', (done) => {
      const newBody = _.cloneDeep(body);
      newBody.completionDate = '2019-01-16T00:00:00.000Z';
      request(server)
        .patch('/v5/timelines/1/milestones/2')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(newBody)
        .expect(200, done);
    });

    it('should return 200 for non-admin member setting the actualStartDate', (done) => {
      const newBody = _.cloneDeep(body);
      newBody.actualStartDate = '2018-05-15T00:00:00.000Z';
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(newBody)
        .expect(200, done);
    });

    it('should return 404 for non-existed timeline', (done) => {
      request(server)
        .patch('/v5/timelines/1234/milestones/1')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted timeline', (done) => {
      request(server)
        .patch('/v5/timelines/3/milestones/1')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for non-existed Milestone', (done) => {
      request(server)
        .patch('/v5/timelines/1/milestones/111')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted Milestone', (done) => {
      request(server)
        .patch('/v5/timelines/1/milestones/5')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 400 for invalid timelineId param', (done) => {
      request(server)
        .patch('/v5/timelines/0/milestones/1')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(400, done);
    });

    it('should return 400 for invalid milestoneId param', (done) => {
      request(server)
        .patch('/v5/timelines/1/milestones/0')
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(400, done);
    });

    it('should return 200 for missing name', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.name;
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing type', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.type;
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing duration', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.duration;
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing order', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.order;
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing plannedText', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.plannedText;
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing blockedText', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.blockedText;
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing activeText', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.activeText;
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing completedText', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.completedText;
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    it('should return 200 for missing hidden field', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.hidden;
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200, done);
    });

    ['startDate', 'endDate'].forEach((field) => {
      it(`should return 400 if ${field} is present in the payload`, (done) => {
        const invalidBody = _.assign({}, body, {
          [field]: '2018-07-01T00:00:00.000Z',
        });

        request(server)
          .patch('/v5/timelines/1/milestones/1')
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send(invalidBody)
          .expect('Content-Type', /json/)
          .expect(400, done);
      });
    });

    it('should return 200 for admin', (done) => {
      const newBody = _.cloneDeep(body);
      newBody.completionDate = '2018-05-15T00:00:00.000Z';
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(newBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          should.exist(resJson.id);
          resJson.name.should.be.eql(body.name);
          resJson.description.should.be.eql(body.description);
          resJson.duration.should.be.eql(body.duration);
          resJson.completionDate.should.be.eql(newBody.completionDate);
          resJson.status.should.be.eql(body.status);
          resJson.type.should.be.eql(body.type);
          resJson.details.should.be.eql({
            detail1: { subDetail1A: 0, subDetail1C: 3 },
            detail2: [4],
            detail3: 3,
          });
          resJson.order.should.be.eql(body.order);
          resJson.plannedText.should.be.eql(body.plannedText);
          resJson.activeText.should.be.eql(body.activeText);
          resJson.completedText.should.be.eql(body.completedText);
          resJson.blockedText.should.be.eql(body.blockedText);

          should.exist(resJson.createdBy);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
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

    // eslint-disable-next-line func-names
    it('should return 200 for admin - order increases and replaces another milestone\'s order', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(_.assign({}, body, { order: 4 })) // 1 to 4
        .expect(200)
        .end(() => {
          models.Milestone.findByPk(1)
            .then((milestone) => {
              milestone.order.should.be.eql(4);
            })
            .then(() => models.Milestone.findByPk(2))
            .then((milestone) => {
              milestone.order.should.be.eql(2);
            })
            .then(() => models.Milestone.findByPk(3))
            .then((milestone) => {
              milestone.order.should.be.eql(3);
            })
            .then(() => models.Milestone.findByPk(4))
            .then((milestone) => {
              milestone.order.should.be.eql(4);
              done();
            });
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - order increases and doesnot replace another milestone\'s order', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(_.assign({}, body, { order: 5 })) // 1 to 5
        .expect(200)
        .end(() => {
          // Milestone 1: order 5
          // Milestone 2: order 2
          // Milestone 3: order 3
          // Milestone 4: order 4
          models.Milestone.findByPk(1)
            .then((milestone) => {
              milestone.order.should.be.eql(5);
            })
            .then(() => models.Milestone.findByPk(2))
            .then((milestone) => {
              milestone.order.should.be.eql(2);
            })
            .then(() => models.Milestone.findByPk(3))
            .then((milestone) => {
              milestone.order.should.be.eql(3);
            })
            .then(() => models.Milestone.findByPk(4))
            .then((milestone) => {
              milestone.order.should.be.eql(4);

              done();
            });
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - order decreases and replaces another milestone\'s order', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v5/timelines/1/milestones/4')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(_.assign({}, body, { order: 2 })) // 4 to 2
        .expect(200)
        .end(() => {
          models.Milestone.findByPk(1)
            .then((milestone) => {
              milestone.order.should.be.eql(1);
            })
            .then(() => models.Milestone.findByPk(2))
            .then((milestone) => {
              milestone.order.should.be.eql(2);
            })
            .then(() => models.Milestone.findByPk(3))
            .then((milestone) => {
              milestone.order.should.be.eql(3);
            })
            .then(() => models.Milestone.findByPk(4))
            .then((milestone) => {
              milestone.order.should.be.eql(2);
              done();
            });
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - order decreases and doesnot replace another milestone\'s order', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v5/timelines/1/milestones/4')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(_.assign({}, body, { order: 0 })) // 4 to 0
        .expect(200)
        .end(() => {
          // Milestone 1: order 1
          // Milestone 2: order 2
          // Milestone 3: order 3
          // Milestone 4: order 0
          models.Milestone.findByPk(1)
            .then((milestone) => {
              milestone.order.should.be.eql(1);
            })
            .then(() => models.Milestone.findByPk(2))
            .then((milestone) => {
              milestone.order.should.be.eql(2);
            })
            .then(() => models.Milestone.findByPk(3))
            .then((milestone) => {
              milestone.order.should.be.eql(3);
            })
            .then(() => models.Milestone.findByPk(4))
            .then((milestone) => {
              milestone.order.should.be.eql(0);

              done();
            });
        });
    });

    // eslint-disable-next-line func-names
    it('should return 200 for admin - changing order with only 1 item in list', function (done) {
      this.timeout(10000);

      request(server)
        .patch('/v5/timelines/2/milestones/6')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(_.assign({}, body, { order: 0 })) // 1 to 0
        .expect(200)
        .end(() => {
          // Milestone 6: order 0
          models.Milestone.findByPk(6)
            .then((milestone) => {
              milestone.order.should.be.eql(0);

              done();
            })
            .catch(done);
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
          status: 'active',
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
          status: 'active',
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
            .patch('/v5/timelines/2/milestones/8')
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(_.assign({}, body, { order: 2 })) // 4 to 2
            .expect(200)
            .end(() => {
              // Milestone 6: order 1 => 1
              // Milestone 7: order 3 => 3
              // Milestone 8: order 4 => 2
              models.Milestone.findByPk(6)
                .then((milestone) => {
                  milestone.order.should.be.eql(1);
                })
                .then(() => models.Milestone.findByPk(7))
                .then((milestone) => {
                  milestone.order.should.be.eql(3);
                })
                .then(() => models.Milestone.findByPk(8))
                .then((milestone) => {
                  milestone.order.should.be.eql(2);

                  done();
                })
                .catch(done);
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
          status: 'active',
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
          status: 'active',
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
            .patch('/v5/timelines/2/milestones/8')
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(_.assign({}, body, { order: 2 })) // 4 to 2
            .expect(200)
            .end(() => {
              models.Milestone.findByPk(6)
                .then((milestone) => {
                  milestone.order.should.be.eql(1);
                })
                .then(() => models.Milestone.findByPk(7))
                .then((milestone) => {
                  milestone.order.should.be.eql(2);
                })
                .then(() => models.Milestone.findByPk(8))
                .then((milestone) => {
                  milestone.order.should.be.eql(2);

                  done();
                })
                .catch(done);
            });
        });
    });

    xit('should return 200 for admin - marking milestone active later will adjust actual start date and end date'
      // eslint-disable-next-line func-names
      , function (done) {
        this.timeout(10000);
        const today = moment.utc().hours(0).minutes(0).seconds(0)
          .milliseconds(0);

        request(server)
          .patch('/v5/timelines/1/milestones/2')
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send({ status: MILESTONE_STATUS.ACTIVE })
          .expect(200)
          .end(() => {
            models.Milestone.findByPk(2)
              .then((milestone) => {
                should.exist(milestone.actualStartDate);
                moment.utc(milestone.actualStartDate).diff(today, 'days').should.be.eql(0);
                // start date of the updated milestone should not change
                milestone.startDate.should.be.eql(new Date('2018-05-14T00:00:00.000Z'));
                today.add('days', milestone.duration - 1);
                // end date of the updated milestone should change, as delayed start caused scheduled to be delayed
                moment.utc(milestone.endDate).diff(today, 'days').should.be.eql(0);
                milestone.status.should.be.eql(MILESTONE_STATUS.ACTIVE);
                done();
              })
              .catch(done);
          });
      });

    xit('should return 200 for admin - changing completionDate will set status to completed',
      // eslint-disable-next-line func-names
      function (done) {
        this.timeout(10000);
        const data = Object.assign({}, body, { completionDate: '2018-05-18T00:00:00.000Z',
          order: undefined,
          duration: undefined });
        delete data.status;
        request(server)
          .patch('/v5/timelines/1/milestones/2')
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send(data)
          .expect(200)
          .end(() => {
            models.Milestone.findByPk(2)
              .then((milestone) => {
                milestone.status.should.be.eql(MILESTONE_STATUS.COMPLETED);
                done();
              })
              .catch(done);
          });
      });

    xit('should return 200 for admin - changing duration will adjust the milestone endDate',
      // eslint-disable-next-line func-names
      function (done) {
        this.timeout(10000);
        request(server)
          .patch('/v5/timelines/1/milestones/2')
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send(_.assign({}, body, { duration: 5, order: undefined, completionDate: undefined }))
          .expect(200)
          .end(() => {
            models.Milestone.findByPk(2)
              .then((milestone) => {
                milestone.startDate.should.be.eql(new Date('2018-05-14T00:00:00.000Z'));
                milestone.endDate.should.be.eql(new Date('2018-05-18T00:00:00.000Z'));
                done();
              })
              .catch(done);
          });
      });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });

    it('should return 200 for admin updating the completionDate', (done) => {
      const newBody = _.cloneDeep(body);
      newBody.completionDate = '2018-05-16T00:00:00.000Z';
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(newBody)
        .expect(200, done);
    });

    it('should return 200 for admin updating the actualStartDate', (done) => {
      const newBody = _.cloneDeep(body);
      newBody.actualStartDate = '2018-05-15T00:00:00.000Z';
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(newBody)
        .expect(200, done);
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });

    it('should return 400 if try to pause and statusComment is missed', (done) => {
      const newBody = _.cloneDeep(body);
      newBody.status = 'paused';
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(newBody)
        .expect(400, done);
    });

    it('should return 400 if try to pause not active milestone', (done) => {
      const newBody = _.cloneDeep(body);
      newBody.status = 'paused';
      newBody.statusComment = 'milestone paused';
      request(server)
        .patch('/v5/timelines/1/milestones/2')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(newBody)
        .expect(400, done);
    });

    it('should return 200 if try to pause and should have one status history created', (done) => {
      const newBody = _.cloneDeep(body);
      newBody.status = 'paused';
      newBody.statusComment = 'milestone paused';
      request(server)
        .patch('/v5/timelines/1/milestones/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(newBody)
        .expect(200)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            models.Milestone.findByPk(1).then((milestone) => {
              milestone.status.should.be.eql('paused');
              return models.StatusHistory.findAll({
                where: {
                  reference: 'milestone',
                  referenceId: milestone.id,
                  status: milestone.status,
                  comment: 'milestone paused',
                },
                paranoid: false,
              }).then((statusHistories) => {
                statusHistories.length.should.be.eql(1);
                done();
              });
            });
          }
        });
    });

    it('should return 400 if try to resume not paused milestone', (done) => {
      const newBody = _.cloneDeep(body);
      newBody.status = 'resume';
      request(server)
        .patch('/v5/timelines/1/milestones/2')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(newBody)
        .expect(400, done);
    });

    it('should return 200 if try to resume then status should update to last status and ' +
        'should have one status history created', (done) => {
      const newBody = _.cloneDeep(body);
      newBody.status = 'resume';
      newBody.statusComment = 'new comment';
      models.Milestone.bulkCreate([
        {
          id: 7,
          timelineId: 1,
          name: 'Milestone 1 [paused]',
          duration: 2,
          startDate: '2018-05-13T00:00:00.000Z',
          endDate: '2018-05-14T00:00:00.000Z',
          completionDate: '2018-05-16T00:00:00.000Z',
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
      ]).then(() => models.Milestone.findByPk(7)
        // pause milestone before resume
        .then(milestone => milestone.update(_.assign({}, milestone.toJSON(), { status: 'paused' }))),
      ).then(() => {
        request(server)
          .patch('/v5/timelines/1/milestones/7')
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .send(newBody)
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              models.Milestone.findByPk(7).then((milestone) => {
                milestone.status.should.be.eql('active');

                return models.StatusHistory.findAll({
                  where: {
                    reference: 'milestone',
                    referenceId: milestone.id,
                    status: 'active',
                    comment: 'new comment',
                  },
                  paranoid: false,
                }).then((statusHistories) => {
                  statusHistories.length.should.be.eql(1);
                  done();
                }).catch(done);
              }).catch(done);
            }
          });
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

      it('sends send correct BUS API messages when milestone details updated and waiting for customer', (done) => {
        request(server)
          .patch('/v5/timelines/1/milestones/1')
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({
            details: {
              metadata: { waitingForCustomer: true },
            },
          })
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(3);

                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_UPDATED, sinon.match({
                  resource: RESOURCES.MILESTONE,
                  details: {
                    metadata: { waitingForCustomer: true },
                  },
                })).should.be.true;

                // Check Notification Service events
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.MILESTONE_UPDATED, sinon.match({
                  projectId: 1,
                  projectName: 'test1',
                  projectUrl: 'https://local.topcoder-dev.com/projects/1',
                  userId: 40051332,
                  initiatorUserId: 40051332,
                })).should.be.true;
                createEventSpy.calledWith(CONNECT_NOTIFICATION_EVENT.MILESTONE_WAITING_CUSTOMER)
                  .should.be.true;

                done();
              });
            }
          });
      });

      it('should send message BUS_API_EVENT.MILESTONE_UPDATED when milestone duration updated', (done) => {
        request(server)
          .patch('/v5/timelines/1/milestones/1')
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({
            duration: 1,
          })
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.calledOnce.should.be.false;
                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_UPDATED,
                  sinon.match({ resource: RESOURCES.MILESTONE })).should.be.true;
                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_UPDATED,
                  sinon.match({ duration: 1 })).should.be.true;
                done();
              });
            }
          });
      });

      it('should send message BUS_API_EVENT.MILESTONE_UPDATED when milestone status updated', (done) => {
        request(server)
          .patch('/v5/timelines/1/milestones/1')
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({
            status: 'reviewed',
          })
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.calledOnce.should.be.false;
                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_UPDATED,
                  sinon.match({ resource: RESOURCES.MILESTONE })).should.be.true;
                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_UPDATED,
                  sinon.match({ status: 'reviewed' })).should.be.true;
                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when milestone order updated', (done) => {
        request(server)
          .patch('/v5/timelines/1/milestones/1')
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({
            order: 2,
          })
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(2);

                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_UPDATED, sinon.match({
                  resource: RESOURCES.MILESTONE,
                  order: 2,
                })).should.be.true;
                done();
              });
            }
          });
      });

      it('should send correct BUS API messages when milestone plannedText updated', (done) => {
        request(server)
          .patch('/v5/timelines/1/milestones/1')
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .send({
            plannedText: 'new text',
          })
          .expect(200)
          .end((err) => {
            if (err) {
              done(err);
            } else {
              testUtil.wait(() => {
                createEventSpy.callCount.should.be.eql(2);

                createEventSpy.calledWith(BUS_API_EVENT.MILESTONE_UPDATED, sinon.match({
                  resource: RESOURCES.MILESTONE,
                  plannedText: 'new text',
                })).should.be.true;

                done();
              });
            }
          });
      });
    });
  });
});
