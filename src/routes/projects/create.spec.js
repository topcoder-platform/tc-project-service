/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import chai from 'chai';
import moment from 'moment';
import sinon from 'sinon';
import request from 'supertest';

import util from '../../util';
import server from '../../app';
import testUtil from '../../tests/util';
import RabbitMQService from '../../services/rabbitmq';
import models from '../../models';

const should = chai.should();
const expect = chai.expect;

describe('Project create', () => {
  before((done) => {
    sinon.stub(RabbitMQService.prototype, 'init', () => {});
    sinon.stub(RabbitMQService.prototype, 'publish', () => {});
    testUtil.clearDb()
      .then(() => models.ProjectType.bulkCreate([
        {
          key: 'generic',
          displayName: 'Generic',
          icon: 'http://example.com/icon1.ico',
          question: 'question 1',
          info: 'info 1',
          aliases: ['key-1', 'key_1'],
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
      ]))
      .then(() => done());
  });

  after((done) => {
    RabbitMQService.prototype.init.restore();
    RabbitMQService.prototype.publish.restore();
    testUtil.clearDb(done);
  });

  describe('POST /projects', () => {
    const body = {
      param: {
        type: 'generic',
        description: 'test project',
        details: {},
        billingAccountId: 1,
        name: 'test project1',
        bookmarks: [{
          title: 'title1',
          address: 'http://www.address.com',
        }],
      },
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
        .post('/v4/projects')
        .send(body)
        .expect(403, done);
    });

    it('should return 422 if validations dont pass', (done) => {
      const invalidBody = _.cloneDeep(body);
      delete invalidBody.param.name;
      request(server)
        .post('/v4/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if project type is missing', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.param.type = null;
      request(server)
        .post('/v4/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if project type does not exist', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.param.type = 'not_exist';
      request(server)
        .post('/v4/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if templateId does not exist', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.param.templateId = 3000;
      request(server)
        .post('/v4/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 if phaseProduct count exceeds max value', (done) => {
      const invalidBody = _.cloneDeep(body);
      invalidBody.param.templateId = 1;
      request(server)
        .post('/v4/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 201 if error to create direct project', (done) => {
      const validBody = _.cloneDeep(body);
      validBody.param.templateId = 3;
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.reject(new Error('error message')),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post('/v4/projects')
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
            const result = res.body.result;
            result.success.should.be.truthy;
            result.status.should.equal(201);
            server.services.pubsub.publish.calledWith('project.draft-created').should.be.true;
            done();
          }
        });
    });

    it('should return 201 if valid user and data', (done) => {
      const validBody = _.cloneDeep(body);
      validBody.param.templateId = 3;
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
        .post('/v4/projects')
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
            const resJson = res.body.result.content;
            should.exist(resJson);
            should.exist(resJson.billingAccountId);
            should.exist(resJson.name);
            resJson.directProjectId.should.be.eql(128);
            resJson.status.should.be.eql('draft');
            resJson.type.should.be.eql(body.param.type);
            resJson.version.should.be.eql('v3');
            resJson.members.should.have.lengthOf(1);
            resJson.members[0].role.should.be.eql('customer');
            resJson.members[0].userId.should.be.eql(40051331);
            resJson.members[0].projectId.should.be.eql(resJson.id);
            resJson.members[0].isPrimary.should.be.truthy;
            resJson.bookmarks.should.have.lengthOf(1);
            resJson.bookmarks[0].title.should.be.eql('title1');
            resJson.bookmarks[0].address.should.be.eql('http://www.address.com');
            server.services.pubsub.publish.calledWith('project.draft-created').should.be.true;
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
        .post('/v4/projects')
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
            const resJson = res.body.result.content;
            should.exist(resJson);
            should.exist(resJson.billingAccountId);
            should.exist(resJson.name);
            resJson.directProjectId.should.be.eql(128);
            resJson.status.should.be.eql('draft');
            resJson.type.should.be.eql(body.param.type);
            resJson.version.should.be.eql('v2');
            resJson.members.should.have.lengthOf(1);
            resJson.members[0].role.should.be.eql('customer');
            resJson.members[0].userId.should.be.eql(40051331);
            resJson.members[0].projectId.should.be.eql(resJson.id);
            resJson.members[0].isPrimary.should.be.truthy;
            resJson.bookmarks.should.have.lengthOf(1);
            resJson.bookmarks[0].title.should.be.eql('title1');
            resJson.bookmarks[0].address.should.be.eql('http://www.address.com');
            server.services.pubsub.publish.calledWith('project.draft-created').should.be.true;
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
        .post('/v4/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(_.merge({ param: { templateId: 3 } }, body))
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            should.exist(resJson.billingAccountId);
            should.exist(resJson.name);
            resJson.directProjectId.should.be.eql(128);
            resJson.status.should.be.eql('draft');
            resJson.type.should.be.eql(body.param.type);
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
            server.services.pubsub.publish.calledWith('project.draft-created').should.be.true;
            done();
          }
        });
    });
  });
});
