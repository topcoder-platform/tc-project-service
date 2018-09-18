/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import sinon from 'sinon';
import chai, { expect } from 'chai';
import models from '../../models';
import { projectUpdatedKafkaHandler } from './index';
import testUtil from '../../tests/util';

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

  const mockedApp = {
    services: {
      pubsub: {
        publish: sinon.stub(),
      },
    },
  };

  it('should throw exception when payload is not a valid json', async () => {
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, 'string')).to.be.rejectedWith(SyntaxError);
  });

  it('should throw validation exception when payload is empty', async () => {
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, '{}')).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when projectId is not set', async () => {
    const payload = _.omit(validPayload, 'projectId');
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, JSON.stringify(payload))).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when projectName is not set', async () => {
    const payload = _.omit(validPayload, 'projectName');
    await expect(projectUpdatedKafkaHandler(mockedApp, mockedApp, topic, JSON.stringify(payload)))
      .to.be.rejectedWith(Error);
  });

  it('should throw validation exception when projectUrl is not set', async () => {
    const payload = _.omit(validPayload, 'projectUrl');
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, JSON.stringify(payload))).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when userId is not set', async () => {
    const payload = _.omit(validPayload, 'userId');
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, JSON.stringify(payload))).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when initiatorUserId is not set', async () => {
    const payload = _.omit(validPayload, 'initiatorUserId');
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, JSON.stringify(payload))).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when projectId is not integer', async () => {
    const payload = _.clone(validPayload);
    payload.projectId = 'string';
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, JSON.stringify(payload))).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when projectUrl is not a valid url', async () => {
    const payload = _.clone(validPayload);
    payload.projectUrl = 'string';
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, JSON.stringify(payload))).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when userId is not integer', async () => {
    const payload = _.clone(validPayload);
    payload.userId = 'string';
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, JSON.stringify(payload))).to.be.rejectedWith(Error);
  });

  it('should throw validation exception when initiatorUserId is not integer', async () => {
    const payload = _.clone(validPayload);
    payload.initiatorUserId = 'string';
    await expect(projectUpdatedKafkaHandler(mockedApp, topic, JSON.stringify(payload))).to.be.rejectedWith(Error);
  });

  describe('integration', () => {
    let project;

    beforeEach(async () => {
      await testUtil.clearDb();
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
        lastActivityUserId: 1,
      });
    });

    afterEach(async () => {
      await testUtil.clearDb();
    });

    it('should throw exception when project not found by id', async () => {
      const payload = _.clone(validPayload);
      payload.projectId = 2;
      await expect(projectUpdatedKafkaHandler(mockedApp, topic, JSON.stringify(payload))).to.be
        .rejectedWith(Error, 'Project with id 2 not found');
    });

    it('should update lastActivityAt and lastActivityUserId columns in db', async () => {
      await projectUpdatedKafkaHandler(mockedApp, topic, JSON.stringify(validPayload));

      const updatedProject = await models.Project.findById(project.id);
      expect(updatedProject.lastActivityUserId).to.be.eql(2);
      expect(updatedProject.lastActivityAt).to.be.greaterThan(project.lastActivityAt);
    });

    it('should update ES index', async () => {
      await projectUpdatedKafkaHandler(mockedApp, topic, JSON.stringify(validPayload));
      // Check that message has been sent to RabbitMQ as it updates ES
      expect(mockedApp.services.pubsub.publish).to.be.called;
    });
  });
});
