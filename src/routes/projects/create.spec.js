/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';

import util from '../../util';
import server from '../../app';
import testUtil from '../../tests/util';
import RabbitMQService from '../../services/rabbitmq';
import models from '../../models';

const should = chai.should();

describe('Project create', () => {
  before((done) => {
    sinon.stub(RabbitMQService.prototype, 'init', () => {});
    sinon.stub(RabbitMQService.prototype, 'publish', () => {});
    testUtil.clearDb(done);
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
      const mockHttpClient = _.merge(testUtil.mockHttpClient, {
        post: () => Promise.reject(new Error('error message')),
      });
      sandbox.stub(util, 'getHttpClient', () => mockHttpClient);
      request(server)
        .post('/v4/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
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
        .send(body)
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
            phases[0].details.should.be.eql({ description: 'detailed description' });
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
