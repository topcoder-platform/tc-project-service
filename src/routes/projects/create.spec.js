/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import config from 'config';
import chai from 'chai';
import moment from 'moment';
import sinon from 'sinon';
import request from 'supertest';

import util from '../../util';
import server from '../../app';
import testUtil from '../../tests/util';
import models from '../../models';
import { ATTACHMENT_TYPES } from '../../constants';

const should = chai.should();
const expect = chai.expect;

describe('Project create', () => {
  before((done) => {
    testUtil.clearDb()
      .then(() => testUtil.clearES())
      .then(() => models.ProjectType.bulkCreate([
        {
          key: 'generic',
          displayName: 'Generic',
          icon: 'http://example.com/icon1.ico',
          question: 'question 1',
          info: 'info 1',
          aliases: ['key-1', 'key_1'],
          metadata: {},
          createdBy: 1,
          updatedBy: 1,
        },
      ]))
      .then(() => models.ProductTemplate.bulkCreate([
        {
          id: 21,
          name: 'template 1',
          productKey: 'productKey-1',
          category: 'generic',
          subCategory: 'generic',
          icon: 'http://example.com/icon2.ico',
          brief: 'brief 1',
          details: 'details 1',
          aliases: {},
          template: {},
          createdBy: 3,
          updatedBy: 4,
        },
        {
          id: 22,
          name: 'template 2',
          productKey: 'productKey-2',
          category: 'generic',
          subCategory: 'generic',
          icon: 'http://example.com/icon2.ico',
          brief: 'brief 2',
          details: 'details 2',
          aliases: {},
          template: {},
          createdBy: 3,
          updatedBy: 4,
        },
        {
          id: 23,
          name: 'template 3',
          productKey: 'productKey-3',
          category: 'generic',
          subCategory: 'generic',
          icon: 'http://example.com/icon3.ico',
          brief: 'brief 3',
          details: 'details 3',
          aliases: {},
          template: {},
          createdBy: 3,
          updatedBy: 4,
        },
      ]))
      .then(() => models.ProjectTemplate.bulkCreate([
        {
          id: 1,
          name: 'template 1',
          key: 'key 1',
          category: 'category 1',
          icon: 'http://example.com/icon1.ico',
          question: 'question 1',
          info: 'info 1',
          aliases: [],
          scope: {},
          phases: {
            phase1: {
              name: 'phase 1',
              duration: 5,
              products: [
                {
                  id: 21,
                  name: 'product 1',
                  productKey: 'visual_design_prod1',
                },
                {
                  id: 22,
                  name: 'product 2',
                  productKey: 'visual_design_prod2',
                },
              ],
            },
          },
          createdBy: 1,
          updatedBy: 1,
        },
        {
          id: 3,
          name: 'template 3',
          key: 'key 3',
          category: 'category 3',
          icon: 'http://example.com/icon3.ico',
          question: 'question 3',
          info: 'info 3',
          aliases: [],
          scope: {},
          phases: {
            1: {
              name: 'Design Stage',
              status: 'open',
              duration: 10,
              details: {
                description: 'detailed description',
              },
              products: [
                {
                  id: 21,
                  name: 'product 1',
                  productKey: 'visual_design_prod',
                },
              ],
            },
            2: {
              name: 'Development Stage',
              status: 'open',
              duration: 20,
              products: [
                {
                  id: 23,
                  name: 'product 2',
                  details: {
                    subDetails: 'subDetails 2',
                  },
                  productKey: 'website_development',
                },
              ],
            },
            3: {
              name: 'QA Stage',
              status: 'open',
            },
          },
          createdBy: 1,
          updatedBy: 2,
        },
        {
          id: 4,
          name: 'template with workstreams',
          key: 'key 3',
          category: 'category 3',
          icon: 'http://example.com/icon3.ico',
          question: 'question 3',
          info: 'info 3',
          aliases: [],
          scope: {},
          phases: {
            workstreamsConfig: {
              projectFieldName: 'details.appDefinition.deliverables',
              workstreamTypesToProjectValues: {
                development: [
                  'dev-qa',
                ],
                design: [
                  'design',
                ],
                deployment: [
                  'deployment',
                ],
                qa: [
                  'dev-qa',
                ],
              },
              workstreams: [
                {
                  name: 'Design Workstream',
                  type: 'design',
                },
                {
                  name: 'Development Workstream',
                  type: 'development',
                },
                {
                  name: 'QA Workstream',
                  type: 'qa',
                },
                {
                  name: 'Deployment Workstream',
                  typ: 'deployment',
                },
              ],
            },
          },
          createdBy: 1,
          updatedBy: 2,
        },
      ]))
      .then(() => models.BuildingBlock.bulkCreate([
        {
          id: 1,
          key: 'BLOCK_KEY',
          config: {},
          privateConfig: {
            priceItems: {
              community: 3456,
              topcoder_service: '19%',
              fee: 1234,
            },
          },
          createdBy: 1,
          updatedBy: 2,
        },
        {
          id: 2,
          key: 'BLOCK_KEY2',
          config: {},
          privateConfig: {
            message: 'invalid config',
          },
          createdBy: 1,
          updatedBy: 2,
        },
        {
          id: 3,
          key: 'BLOCK_KEY3',
          config: {},
          privateConfig: {
            priceItems: {
              community: '34%',
              topcoder_service: 6789,
              fee: '56%',
            },
          },
          createdBy: 1,
          updatedBy: 2,
        },
      ]))
      .then(() => done());
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects', () => {
    const body = {
      type: 'generic',
      description: 'test project',
      details: {},
      name: 'test project1',
      bookmarks: [{
        title: 'title1',
        address: 'http://www.address.com',
      }],
    };

    const bodyWithAttachments = {
      type: 'generic',
      description: 'test project',
      details: {},
      name: 'test project1',
      attachments: [
        {
          title: 'file1.txt',
          description: 'blah',
          contentType: 'application/unknown',
          size: 12312,
          category: 'categ1',
          path: 'https://media.topcoder.com/projects/1/test.txt',
          type: ATTACHMENT_TYPES.FILE,
          tags: ['tag1', 'tag2'],
        },
        {
          title: 'Test Link 1',
          description: 'Test link 1 description',
          size: 123456,
          category: 'categ1',
          path: 'https://connect.topcoder-dev.com/projects/8600/assets',
          type: ATTACHMENT_TYPES.LINK,
          tags: ['tag3', 'tag4'],
        },
      ],
    };

    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .post('/v5/projects')
        .send(body)
        .expect(403, done);
    });

    it('should return 400 if validations dont pass', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.name;
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if project type is missing', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.type = null;
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if project type does not exist', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.type = 'not_exist';
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if templateId does not exist', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.templateId = 3000;
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 if phaseProduct count exceeds max value', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.templateId = 1;
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 400 with wrong format estimation field', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.estimation = [
        {

        },
      ];
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    xit(`should return 400 when creating project with billingAccountId
      without "write:projects-billing-accounts" scope in M2M token`, (done) => {
      const validBody = _.cloneDeep(body);
      validBody.billingAccountId = 1;
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.m2m['write:projects']}`,
        })
        .send(validBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    xit(`should return 400 when creating project with directProjectId
      without "write:projects" scope in M2M token`, (done) => {
      const validBody = _.cloneDeep(body);
      validBody.directProjectId = 1;
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.m2m['write:project-members']}`,
        })
        .send(validBody)
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return 201 if valid user and data', (done) => {
      const validBody = _.cloneDeep(body);
      validBody.templateId = 3;
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                projectId: 128,
              },
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(validBody)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            should.not.exist(resJson.billingAccountId);
            should.exist(resJson.name);
            resJson.status.should.be.eql('in_review');
            resJson.type.should.be.eql(body.type);
            resJson.version.should.be.eql('v3');
            resJson.members.should.have.lengthOf(1);
            resJson.members[0].role.should.be.eql('customer');
            resJson.members[0].userId.should.be.eql(40051331);
            resJson.members[0].projectId.should.be.eql(resJson.id);
            resJson.members[0].isPrimary.should.be.truthy;
            resJson.bookmarks.should.have.lengthOf(1);
            resJson.bookmarks[0].title.should.be.eql('title1');
            resJson.bookmarks[0].address.should.be.eql('http://www.address.com');
            // Check that activity fields are set
            resJson.lastActivityUserId.should.be.eql('40051331');
            resJson.lastActivityAt.should.be.not.null;
            done();
          }
        });
    });

    it('should create project successfully using M2M token with "write:projects" scope', (done) => {
      const validBody = _.cloneDeep(body);
      validBody.templateId = 3;
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                projectId: 128,
              },
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.m2m['write:projects']}`,
        })
        .send(validBody)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            should.not.exist(resJson.billingAccountId);
            should.exist(resJson.name);
            resJson.status.should.be.eql('in_review');
            resJson.type.should.be.eql(body.type);
            resJson.version.should.be.eql('v3');
            resJson.members.should.have.lengthOf(1);
            resJson.members[0].role.should.be.eql('manager');
            resJson.members[0].userId.should.be.eql(config.DEFAULT_M2M_USERID);
            resJson.members[0].projectId.should.be.eql(resJson.id);
            resJson.members[0].isPrimary.should.be.truthy;
            resJson.bookmarks.should.have.lengthOf(1);
            resJson.bookmarks[0].title.should.be.eql('title1');
            resJson.bookmarks[0].address.should.be.eql('http://www.address.com');
            // Check that activity fields are set
            resJson.lastActivityUserId.should.be.eql(config.DEFAULT_M2M_USERID.toString());
            resJson.lastActivityAt.should.be.not.null;
            done();
          }
        });
    });

    it('should return 201 if valid user and data (without template id: backward compatibility)', (done) => {
      const validBody = _.cloneDeep(body);
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                projectId: 128,
              },
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(validBody)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            should.not.exist(resJson.billingAccountId);
            should.exist(resJson.name);
            resJson.status.should.be.eql('in_review');
            resJson.type.should.be.eql(body.type);
            resJson.version.should.be.eql('v2');
            resJson.members.should.have.lengthOf(1);
            resJson.members[0].role.should.be.eql('customer');
            resJson.members[0].userId.should.be.eql(40051331);
            resJson.members[0].projectId.should.be.eql(resJson.id);
            resJson.members[0].isPrimary.should.be.truthy;
            resJson.bookmarks.should.have.lengthOf(1);
            resJson.bookmarks[0].title.should.be.eql('title1');
            resJson.bookmarks[0].address.should.be.eql('http://www.address.com');
            // should not create phases without a template id
            resJson.phases.should.have.lengthOf(0);
            done();
          }
        });
    });

    it('should return 201 if valid user and data with attachments', (done) => {
      const validBody = _.cloneDeep(bodyWithAttachments);
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                projectId: 128,
              },
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(validBody)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            should.not.exist(resJson.billingAccountId);
            should.exist(resJson.name);
            resJson.status.should.be.eql('in_review');
            resJson.type.should.be.eql(bodyWithAttachments.type);
            resJson.version.should.be.eql('v2');
            resJson.members.should.have.lengthOf(1);
            resJson.members[0].role.should.be.eql('customer');
            resJson.members[0].userId.should.be.eql(40051331);
            resJson.members[0].projectId.should.be.eql(resJson.id);
            resJson.members[0].isPrimary.should.be.truthy;

            resJson.attachments.should.have.lengthOf(2);

            should.exist(resJson.attachments[0].id);
            should.exist(resJson.attachments[0].createdAt);
            should.exist(resJson.attachments[0].updatedAt);
            resJson.attachments[0].createdBy.should.equal(40051331);
            resJson.attachments[0].updatedBy.should.equal(40051331);
            resJson.attachments[0].title.should.equal(bodyWithAttachments.attachments[0].title);
            resJson.attachments[0].description.should.equal(bodyWithAttachments.attachments[0].description);
            resJson.attachments[0].contentType.should.equal(bodyWithAttachments.attachments[0].contentType);
            resJson.attachments[0].size.should.equal(bodyWithAttachments.attachments[0].size);
            resJson.attachments[0].category.should.equal(bodyWithAttachments.attachments[0].category);
            resJson.attachments[0].path.should.equal(bodyWithAttachments.attachments[0].path);
            resJson.attachments[0].type.should.equal(bodyWithAttachments.attachments[0].type);
            resJson.attachments[0].tags.should.eql(bodyWithAttachments.attachments[0].tags);

            should.exist(resJson.attachments[1].id);
            should.exist(resJson.attachments[1].createdAt);
            should.exist(resJson.attachments[1].updatedAt);
            resJson.attachments[1].createdBy.should.equal(40051331);
            resJson.attachments[1].updatedBy.should.equal(40051331);
            resJson.attachments[1].title.should.equal(bodyWithAttachments.attachments[1].title);
            resJson.attachments[1].description.should.equal(bodyWithAttachments.attachments[1].description);
            resJson.attachments[1].size.should.equal(bodyWithAttachments.attachments[1].size);
            resJson.attachments[1].category.should.equal(bodyWithAttachments.attachments[1].category);
            resJson.attachments[1].path.should.equal(bodyWithAttachments.attachments[1].path);
            resJson.attachments[1].type.should.equal(bodyWithAttachments.attachments[1].type);
            resJson.attachments[1].tags.should.eql(bodyWithAttachments.attachments[1].tags);

            // should not create phases without a template id
            resJson.phases.should.have.lengthOf(0);
            done();
          }
        });
    });


    it('should return 201 if valid user and data (with templateId)', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                projectId: 128,
              },
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(_.merge({ templateId: 3 }, body))
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            should.not.exist(resJson.billingAccountId);
            should.exist(resJson.name);
            resJson.status.should.be.eql('in_review');
            resJson.type.should.be.eql(body.type);
            resJson.members.should.have.lengthOf(1);
            resJson.members[0].role.should.be.eql('customer');
            resJson.members[0].userId.should.be.eql(40051331);
            resJson.members[0].projectId.should.be.eql(resJson.id);
            resJson.members[0].isPrimary.should.be.truthy;
            resJson.bookmarks.should.have.lengthOf(1);
            resJson.bookmarks[0].title.should.be.eql('title1');
            resJson.bookmarks[0].address.should.be.eql('http://www.address.com');
            resJson.phases.should.have.lengthOf(3);
            const phases = _.sortBy(resJson.phases, p => p.name);
            phases[0].name.should.be.eql('Design Stage');
            phases[0].status.should.be.eql('open');
            phases[0].startDate.should.be.a('string');
            phases[0].duration.should.be.eql(10);
            const startDate = moment.utc(phases[0].startDate);
            startDate.hours().should.be.eql(0);
            startDate.minutes().should.be.eql(0);
            startDate.seconds().should.be.eql(0);
            startDate.milliseconds().should.be.eql(0);
            new Date(phases[0].endDate).should.be.eql(startDate.add(9, 'days').toDate());
            expect(phases[0].details).to.be.empty;
            phases[0].products.should.have.lengthOf(1);
            phases[0].products[0].name.should.be.eql('product 1');
            phases[0].products[0].templateId.should.be.eql(21);
            done();
          }
        });
    });

    it('should create project with workstreams if template has them defined', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                projectId: 128,
              },
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(_.merge({
          templateId: 4,
          details: {
            appDefinition: {
              deliverables: ['dev-qa', 'design'],
            },
          },
        }, body))
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            should.not.exist(resJson.billingAccountId);
            should.exist(resJson.name);
            resJson.status.should.be.eql('in_review');
            resJson.type.should.be.eql(body.type);
            resJson.members.should.have.lengthOf(1);
            resJson.members[0].role.should.be.eql('customer');
            resJson.members[0].userId.should.be.eql(40051331);
            resJson.members[0].projectId.should.be.eql(resJson.id);
            resJson.members[0].isPrimary.should.be.truthy;
            resJson.bookmarks.should.have.lengthOf(1);
            resJson.bookmarks[0].title.should.be.eql('title1');
            resJson.bookmarks[0].address.should.be.eql('http://www.address.com');
            resJson.phases.should.have.lengthOf(0);

            // verify that project has been marked to use workstreams
            resJson.details.settings.workstreams.should.be.true;

            // Check Workstreams records are created correctly
            models.WorkStream.findAll({
              where: {
                projectId: resJson.id,
              },
              raw: true,
            }).then((workStreams) => {
              workStreams.length.should.be.eql(3);
              _.filter(workStreams, { type: 'development', name: 'Development Workstream' }).length.should.be.eql(1);
              _.filter(workStreams, { type: 'design', name: 'Design Workstream' }).length.should.be.eql(1);
              _.filter(workStreams, { type: 'qa', name: 'QA Workstream' }).length.should.be.eql(1);
              done();
            }).catch(done);
          }
        });
    });

    it('should return 201 if valid user and data (with estimation)', (done) => {
      const validBody = _.cloneDeep(body);
      validBody.estimation = [
        {
          conditions: '( HAS_DESIGN_DELIVERABLE && HAS_ZEPLIN_APP_ADDON && CA_NEEDED)',
          price: 6,
          minTime: 2,
          maxTime: 2,
          metadata: {
            deliverable: 'design',
          },
          buildingBlockKey: 'ZEPLIN_APP_ADDON_CA',
        },
        {
          conditions: '( HAS_DESIGN_DELIVERABLE && COMPREHENSIVE_DESIGN && TWO_TARGET_DEVICES'
            + ' && SCREENS_COUNT_SMALL && CA_NEEDED )',
          price: 95,
          minTime: 14,
          maxTime: 14,
          metadata: {
            deliverable: 'design',
          },
          buildingBlockKey: 'SMALL_COMP_DESIGN_TWO_DEVICE_CA',
        },
        {
          conditions: '( HAS_DEV_DELIVERABLE && (ONLY_ONE_OS_MOBILE || ONLY_ONE_OS_DESKTOP'
            + ' || ONLY_ONE_OS_PROGRESSIVE) && SCREENS_COUNT_SMALL && CA_NEEDED)',
          price: 50,
          minTime: 35,
          maxTime: 35,
          metadata: {
            deliverable: 'dev-qa',
          },
          buildingBlockKey: 'SMALL_DEV_ONE_OS_CA',
        },
        {
          conditions: '( HAS_DEV_DELIVERABLE && HAS_SSO_INTEGRATION_ADDON && CA_NEEDED)',
          price: 80,
          minTime: 5,
          maxTime: 5,
          metadata: {
            deliverable: 'dev-qa',
          },
          buildingBlockKey: 'HAS_SSO_INTEGRATION_ADDON_CA',
        },
        {
          conditions: '( HAS_DEV_DELIVERABLE && HAS_CHECKMARX_SCANNING_ADDON && CA_NEEDED)',
          price: 4,
          minTime: 10,
          maxTime: 10,
          metadata: {
            deliverable: 'dev-qa',
          },
          buildingBlockKey: 'HAS_CHECKMARX_SCANNING_ADDON_CA',
        },
        {
          conditions: '( HAS_DEV_DELIVERABLE && HAS_UNIT_TESTING_ADDON && CA_NEEDED)',
          price: 90,
          minTime: 12,
          maxTime: 12,
          metadata: {
            deliverable: 'dev-qa',
          },
          buildingBlockKey: 'HAS_UNIT_TESTING_ADDON_CA',
        },
      ];
      validBody.templateId = 3;
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                projectId: 128,
              },
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(validBody)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            should.not.exist(resJson.billingAccountId);
            should.exist(resJson.name);
            resJson.status.should.be.eql('in_review');
            resJson.type.should.be.eql(body.type);
            resJson.version.should.be.eql('v3');
            resJson.members.should.have.lengthOf(1);
            resJson.members[0].role.should.be.eql('customer');
            resJson.members[0].userId.should.be.eql(40051331);
            resJson.members[0].projectId.should.be.eql(resJson.id);
            resJson.members[0].isPrimary.should.be.truthy;
            resJson.bookmarks.should.have.lengthOf(1);
            resJson.bookmarks[0].title.should.be.eql('title1');
            resJson.bookmarks[0].address.should.be.eql('http://www.address.com');
            // Check that activity fields are set
            resJson.lastActivityUserId.should.be.eql('40051331');
            resJson.lastActivityAt.should.be.not.null;

            // Check new ProjectEstimation records are created.
            models.ProjectEstimation.findAll({
              where: {
                projectId: resJson.id,
              },
            }).then((projectEstimations) => {
              projectEstimations.length.should.be.eql(6);
              projectEstimations[0].conditions.should.be.eql(
                '( HAS_DESIGN_DELIVERABLE && HAS_ZEPLIN_APP_ADDON && CA_NEEDED)');
              projectEstimations[0].price.should.be.eql(6);
              projectEstimations[0].minTime.should.be.eql(2);
              projectEstimations[0].maxTime.should.be.eql(2);
              projectEstimations[0].metadata.deliverable.should.be.eql('design');
              projectEstimations[0].buildingBlockKey.should.be.eql('ZEPLIN_APP_ADDON_CA');
              done();
            }).catch(done);
          }
        });
    });

    xit('should return 201 if valid user and data (using Bearer userId_<userId>)', (done) => {
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: {
                projectId: 128,
              },
            },
          },
        }),
        get: () => Promise.resolve({
          status: 200,
          data: {
            id: 'requesterId',
            version: 'v3',
            result: {
              success: true,
              status: 200,
              content: [
                {
                  id: 1800075,
                  active: false,
                },
              ],
            },
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: 'Bearer userId_1800075',
        })
        .send(_.merge({ templateId: 3 }, body))
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            server.log.error(err);
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            should.exist(resJson.billingAccountId);
            should.exist(resJson.name);
            resJson.status.should.be.eql('in_review');
            resJson.type.should.be.eql(body.type);
            resJson.members.should.have.lengthOf(1);
            resJson.members[0].role.should.be.eql('customer');
            resJson.members[0].userId.should.be.eql(1800075);
            resJson.members[0].projectId.should.be.eql(resJson.id);
            resJson.members[0].isPrimary.should.be.truthy;
            resJson.bookmarks.should.have.lengthOf(1);
            resJson.bookmarks[0].title.should.be.eql('title1');
            resJson.bookmarks[0].address.should.be.eql('http://www.address.com');
            resJson.phases.should.have.lengthOf(3);
            const phases = _.sortBy(resJson.phases, p => p.name);
            phases[0].name.should.be.eql('Design Stage');
            phases[0].status.should.be.eql('open');
            phases[0].startDate.should.be.a('string');
            phases[0].duration.should.be.eql(10);
            const startDate = moment.utc(phases[0].startDate);
            startDate.hours().should.be.eql(0);
            startDate.minutes().should.be.eql(0);
            startDate.seconds().should.be.eql(0);
            startDate.milliseconds().should.be.eql(0);
            new Date(phases[0].endDate).should.be.eql(startDate.add(9, 'days').toDate());
            expect(phases[0].details).to.be.empty;
            phases[0].products.should.have.lengthOf(1);
            phases[0].products[0].name.should.be.eql('product 1');
            phases[0].products[0].templateId.should.be.eql(21);
            done();
          }
        });
    });

    it('should create correct estimation items with estimation', (done) => {
      const validBody = _.cloneDeep(body);
      validBody.estimation = [
        {
          conditions: '( HAS_DEV_DELIVERABLE && (ONLY_ONE_OS_MOBILE) )',
          price: 1000,
          minTime: 2,
          maxTime: 2,
          metadata: {},
          buildingBlockKey: 'BLOCK_KEY',
        },
        {
          conditions: '( HAS_DEV_DELIVERABLE && (ONLY_ONE_OS_MOBILE) )',
          price: 1000,
          minTime: 2,
          maxTime: 2,
          metadata: {},
          buildingBlockKey: 'BLOCK_KEY2',
        },
        {
          conditions: '( HAS_DEV_DELIVERABLE && (ONLY_ONE_OS_MOBILE) )',
          price: 1000,
          minTime: 2,
          maxTime: 2,
          metadata: {},
          buildingBlockKey: 'BLOCK_KEY3',
        },
      ];
      validBody.templateId = 3;
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.resolve({
          status: 200,
          data: {
            projectId: 128,
          },
        }),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(validBody)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            should.exist(resJson.name);
            should.exist(resJson.estimations);
            resJson.estimations.length.should.be.eql(3);

            const totalPromises = [];
            // check estimation items one by one
            _.forEach(resJson.estimations, estimation => models.ProjectEstimationItem.findAll({
              where: {
                projectEstimationId: estimation.id,
              },
              raw: true,
            }).then((items) => {
              totalPromises.concat(_.map(items, (item) => {
                should.exist(item.type);
                should.exist(item.price);
                should.exist(item.markupUsedReference);
                should.exist(item.markupUsedReferenceId);

                item.markupUsedReference.should.be.eql('buildingBlock');
                if (estimation.buildingBlockKey === 'BLOCK_KEY') {
                  if (item.type === 'community') {
                    item.price.should.be.eql(3456);
                  } else if (item.type === 'topcoder_service') {
                    item.price.should.be.eql(190);
                  } else if (item.type === 'fee') {
                    item.price.should.be.eql(1234);
                  } else {
                    return Promise.reject('estimation item type is not correct');
                  }
                } else if (estimation.buildingBlockKey === 'BLOCK_KEY2') {
                  return Promise.reject('should not create estimation item for invalid building block');
                } else if (estimation.buildingBlockKey === 'BLOCK_KEY3') {
                  if (item.type === 'community') {
                    item.price.should.be.eql(340);
                  } else if (item.type === 'topcoder_service') {
                    item.price.should.be.eql(6789);
                  } else if (item.type === 'fee') {
                    item.price.should.be.eql(560);
                  } else {
                    return Promise.reject('estimation item type is not correct');
                  }
                } else {
                  return Promise.reject('estimation building block key is not correct');
                }
                return Promise.resolve();
              }));
            }));

            Promise.all(totalPromises).then(() => {
              done();
            }).catch(e => done(e));
          }
        });
    });
  });
});
