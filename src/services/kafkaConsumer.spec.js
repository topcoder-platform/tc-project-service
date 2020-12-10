/* eslint-disable no-unused-expressions */
import sinon from 'sinon';
import * as Kafka from 'no-kafka';
import chai from 'chai';

import startKafkaConsumer from './kafkaConsumer';

chai.should();
const expect = chai.expect;

describe('Kafka service', () => {
  const sandbox = sinon.sandbox.create();
  let mockedSubscribe;

  const mockedLogger = {
    debug: sinon.stub(),
    info: sinon.stub(),
    error: sinon.stub(),
  };

  const mockedApp = {
    services: {
      pubsub: {
        publish: sinon.stub(),
      },
    },
  };

  // Mock Kafka consumer class
  before(() => {
    mockedSubscribe = sinon.stub(Kafka.SimpleConsumer.prototype, 'subscribe');
    sinon.stub(Kafka.SimpleConsumer.prototype, 'init').returns(Promise.resolve());
    sinon.stub(Kafka.SimpleConsumer.prototype, 'commitOffset').returns(Promise.resolve());
  });

  afterEach(() => {
    sandbox.reset();
  });

  after(() => {
    sandbox.restore();
  });

  it('subscribes to every topic defined in handlers', async () => {
    const handlers = {
      topic1: () => {},
      topic2: () => {},
    };

    await startKafkaConsumer(handlers, mockedApp, mockedLogger);

    mockedSubscribe.calledTwice.should.be.true;
    mockedSubscribe.firstCall.calledWith('topic1').should.be.true;
    mockedSubscribe.secondCall.calledWith('topic2').should.be.true;
  });

  describe('consumer', () => {
    let consumerFunction;

    let handlers;

    beforeEach(async () => {
      mockedLogger.error.reset();
      mockedLogger.info.reset();

      handlers = {
        topic1: sinon.stub(),
        topic2: sinon.stub(),
      };
      await startKafkaConsumer(handlers, mockedApp, mockedLogger);
      // Get consumer function
      consumerFunction = mockedSubscribe.lastCall.args[1];
    });

    it('calls handler for specific topic only', async () => {
      await consumerFunction([{
        message: {
          value: `{
            "payload": {
              "prop": "message"
            }
          }`,
        },
      }], 'topic1', {});

      handlers.topic1.calledOnce.should.be.true;
      handlers.topic2.notCalled.should.be.true;
    });

    it('logs error and continues when handler fails', async () => {
      handlers.topic2 = sinon.stub().returns(Promise.reject('failure'));

      await consumerFunction([{
        message: {
          value: `{
            "payload": {
              "prop": "message"
            }
          }`,
        },
      }], 'topic2', {});

      expect(handlers.topic2.calledOnce, 'topic2 handler should be called once').to.be.true;
      expect(mockedLogger.error.calledOnce, 'logger.error should be called once').to.be.true;
      mockedLogger.error.calledWith('Message processing failed: failure');
    });

    it('drops message when handler not found', async () => {
      await consumerFunction([{
        message: {
          value: `{
            "payload": {
              "prop": "message"
            }
          }`,
        },
      }], 'unknown-topic', {});

      handlers.topic1.notCalled.should.be.true;
      handlers.topic2.notCalled.should.be.true;
      mockedLogger.info.calledOnce.should.be.true;
      mockedLogger.info.calledWith('No handler configured for topic "unknown-topic".').should.be.true;
    });
  });
});
