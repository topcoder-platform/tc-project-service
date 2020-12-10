/* eslint-disable no-unused-expressions */
/* eslint-disable no-unused-vars */
import _ from 'lodash';
import sinon from 'sinon';
import chai, { expect } from 'chai';
import messageService from '../../services/messageService';
import {
  projectPhaseAddedKafkaHandler,
  projectPhaseUpdatedKafkaHandler,
  projectPhaseRemovedKafkaHandler,
} from './index';
import { BUS_API_EVENT } from '../../constants';

chai.use(require('chai-as-promised'));

chai.should();

describe('project phase Kafka handlers', () => {
  const mockedApp = {
    logger: {
      trace: sinon.stub(),
      debug: sinon.stub(),
      log: sinon.stub(),
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    },
  };
  const topic = {
    id: 1,
    title: 'test project phase',
    posts: [{ id: 1, type: 'post', body: 'body' }],
  };
  const sandbox = sinon.sandbox.create();

  const phasePayload = {
    resource: 'phase',
    createdAt: '2019-06-21T04:42:56.309Z',
    updatedAt: '2019-06-21T04:42:56.310Z',
    spentBudget: 0,
    progress: 0,
    id: 1,
    name: 'test project phase',
    status: 'active',
    startDate: '2018-05-14T17:00:00.000Z',
    endDate: '2018-05-15T17:00:00.000Z',
    budget: 20,
    details: { aDetails: 'a details' },
    projectId: 1,
    createdBy: 40051333,
    updatedBy: 40051333,
    duration: null,
    order: 1,
  };

  describe('projectPhaseAddedKafkaHandler', () => {
    let createMessageSpy;

    beforeEach(() => {
      createMessageSpy = sandbox.spy(messageService, 'createTopic');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should throw validation exception when payload is empty', async () => {
      await expect(
        projectPhaseAddedKafkaHandler(
          mockedApp,
          BUS_API_EVENT.PROJECT_PHASE_CREATED,
          {},
        ),
      ).to.be.rejectedWith(Error);
    });

    it('should call create topic API with valid payload', async () => {
      await projectPhaseAddedKafkaHandler(
        mockedApp,
        BUS_API_EVENT.PROJECT_PHASE_CREATED,
        phasePayload,
      );
      createMessageSpy.calledOnce.should.be.true;
      createMessageSpy.calledWith(
        sinon.match({
          reference: 'project',
          referenceId: '1',
          tag: 'phase#1',
          title: 'test project phase',
        }),
      ).should.be.true;
    });
  });

  describe('projectPhaseUpdatedKafkaHandler', () => {
    let updateMessageSpy;

    beforeEach(() => {
      updateMessageSpy = sandbox.spy(messageService, 'updateTopic');
      sandbox.stub(messageService, 'getTopicByTag', () =>
        Promise.resolve(topic),
      );
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should throw validation exception when payload is empty', async () => {
      await expect(
        projectPhaseUpdatedKafkaHandler(
          mockedApp,
          BUS_API_EVENT.PROJECT_PHASE_UPDATED,
          {},
        ),
      ).to.be.rejectedWith(Error);
    });

    it('should call update topic API with valid payload', async () => {
      const updatedPhasePayload = _.cloneDeep(phasePayload);
      updatedPhasePayload.name = 'test project phase UPDATED';
      await projectPhaseUpdatedKafkaHandler(
        mockedApp,
        BUS_API_EVENT.PROJECT_PHASE_UPDATED,
        updatedPhasePayload,
      );
      updateMessageSpy.calledOnce.should.be.true;
      updateMessageSpy.calledWith(
        topic.id,
        sinon.match({
          title: updatedPhasePayload.name,
          postId: topic.posts[0].id,
          content: topic.posts[0].body,
        }),
      ).should.be.true;
    });
  });

  describe('projectPhaseRemovedKafkaHandler', () => {
    let deleteTopicSpy;
    let deletePostsSpy;

    beforeEach(() => {
      deleteTopicSpy = sandbox.spy(messageService, 'deleteTopic');
      deletePostsSpy = sandbox.spy(messageService, 'deletePosts');
      sandbox.stub(messageService, 'getTopicByTag', () =>
        Promise.resolve(topic),
      );
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should throw validation exception when payload is empty', async () => {
      await expect(
        projectPhaseRemovedKafkaHandler(
          mockedApp,
          BUS_API_EVENT.PROJECT_PHASE_UPDATED,
          {},
        ),
      ).to.be.rejectedWith(Error);
    });

    it('should call delete topic and posts API with valid payload', async () => {
      await projectPhaseRemovedKafkaHandler(
        mockedApp,
        BUS_API_EVENT.PROJECT_PHASE_UPDATED,
        phasePayload,
      );
      deleteTopicSpy.calledOnce.should.be.true;
      deleteTopicSpy.calledWith(topic.id).should.be.true;
      deletePostsSpy.calledWith(topic.id).should.be.true;
    });
  });
});
