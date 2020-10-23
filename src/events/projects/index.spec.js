/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import chai, { expect } from 'chai';
import config from 'config';
import util from '../../util';
import models from '../../models';
import { projectUpdatedKafkaHandler } from './index';
import testUtil from '../../tests/util';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');
const eClient = util.getElasticSearchClient();

chai.use(require('chai-as-promised'));

describe('projectUpdatedKafkaHandler', () => {
  // Any topic name is fine here as routing happens in kafkaConsumer
  const topic = 'topic';

  const validPayload = {
    projectId: 1,
    projectName: 'test project',
    projectUrl: 'http://someurl.com',
    userId: 1,
    initiatorUserId: 2,
  };

  const mockedApp = {};

  it('should throw validation exception when payload is empty', async () => {
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, {})).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when projectId is not set', async () => {
    const payload = _.omit(validPayload, 'projectId');
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, payload)).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when projectName is not set', async () => {
    const payload = _.omit(validPayload, 'projectName');
    await expect(projectUpdatedKafkaHandler(mockedApp, mockedApp, topic, payload))
      .to.be.rejectedWith(Error);
  });

  it('should throw validation exception when projectUrl is not set', async () => {
    const payload = _.omit(validPayload, 'projectUrl');
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, payload)).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when userId is not set', async () => {
    const payload = _.omit(validPayload, 'userId');
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, payload)).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when initiatorUserId is not set', async () => {
    const payload = _.omit(validPayload, 'initiatorUserId');
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, payload)).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when projectId is not integer', async () => {
    const payload = _.clone(validPayload);
    payload.projectId = 'string';
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, payload)).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when projectUrl is not a valid url', async () => {
    const payload = _.clone(validPayload);
    payload.projectUrl = 'string';
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, payload)).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when userId is not integer', async () => {
    const payload = _.clone(validPayload);
    payload.userId = 'string';
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, payload)).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when initiatorUserId is not integer', async () => {
    const payload = _.clone(validPayload);
    payload.initiatorUserId = 'string';
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, payload)).to.be.rejectedWith(Error);
  });

  describe('integration', () => {
    let project;

    beforeEach(async () => {
      await testUtil.clearDb();
      await testUtil.clearES();
      project = await models.Project.create({
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
      });
      // add project to ES index
      await eClient.index({
        index: ES_PROJECT_INDEX,
        type: ES_PROJECT_TYPE,
        id: project.id,
        body: project.get({ plain: true }),
        refresh: 'wait_for',
      });
    });

    after(async () => {
      await testUtil.clearDb();
    });

    it('should throw exception when project not found by id', async () => {
      const payload = _.clone(validPayload);
      payload.projectId = 2;
      await expect(projectUpdatedKafkaHandler(mockedApp, topic, payload)).to.be
        .rejectedWith(Error, 'Project with id 2 not found');
    });

    it('should update lastActivityAt and lastActivityUserId columns in db', async () => {
      await projectUpdatedKafkaHandler(mockedApp, topic, validPayload);

      const updatedProject = await models.Project.findByPk(project.id);
      expect(updatedProject.lastActivityUserId).to.be.eql('2');
      expect(updatedProject.lastActivityAt).to.be.greaterThan(project.lastActivityAt);
    });

    it('should update ES index', async () => {
      await projectUpdatedKafkaHandler(mockedApp, topic, validPayload);

      const doc = await eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: validPayload.projectId });
      const esProject = doc._source; // eslint-disable-line no-underscore-dangle
      expect(esProject.lastActivityUserId).to.be.eql('2');
      expect(new Date(esProject.lastActivityAt)).to.be.greaterThan(project.lastActivityAt);
    });
  });
});
